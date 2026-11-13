"""局部打光：人物/物体分割、蒙版并集、软过渡回贴、接地阴影、头肩补光。

模型推理一律跑在 Windows 节点的 ComfyUI 里（见 comfyui_nodes/chouka_local_models），
服务机这半边只剩 cv2/numpy/Pillow 的纯计算：回贴、接地、头肩、区域投票、蒙版编解码。
所以本模块的体检只查纯计算依赖（in_process_ready），「识别能不能用」是集群判据，
在 cloud_lighting.perception_block 里查节点名册；缺依赖时由调用方在 HTTP 边界回 501，
不做假实现。
回贴/接地/头肩都是纯 numpy 运算，可用合成图单测，不触网、不调用云端。
"""
import base64
from io import BytesIO
import math
import os
import threading

from PIL import Image

PREVIEW_SIDE = 1024
MIN_PERSON_AREA_RATIO = 0.002
# 识别灵敏度三档对应的最小人物占比：宽松捞小目标，严格只留占比大的明确人物。
SENSITIVITY_MIN_AREA = {
    "relaxed": 0.001,
    "standard": MIN_PERSON_AREA_RATIO,
    "strict": 0.01,
}
SHADOW = dict(slope_scale=0.8, decay=13.0, strength=0.45, sigma=4.5, maxdrop=90)
POOL = dict(strength=0.18, sigma=22)
HALO = dict(core=14, start=0.70, over=8, span=26, strength=0.95)
HEAD_RATIO = 0.40
SHADE_SIGMA = 4.0
# 「柔和」边缘的衰减宽度（px）：越宽表示越多云端像素混进背景，轮廓外那圈暗边也越宽。
EDGE_FALLOFF = 6.0
# 云端整图重打光会把脸重新画一遍，直接贴像素必然变形；头部区域只搬明暗不搬形状。
# sigma_frac：搬光时「低频光照」的高斯半径占作用区短边的比例；floor/ceil：单像素倍率上下限。
FACE_GUARD = dict(ratio=0.42, sigma_frac=0.25, floor=0.45, ceil=2.2)
# 轮廓外圈搬光的低频半径，按画面短边的比例取。太小会把模型画在人物周围的那圈暗
# 阴影当成「背景的光照变化」复制到原图上，绕人一圈变成贴纸边。
RING_SIGMA_FRAC = 0.20
# 人物色调回拉：低频颜色往环境靠的比例，亮度不参与（明暗台阶是对的，偏色才是问题）。
TINT = dict(amount=0.5, sigma_frac=0.12)


def in_process_ready():
    """服务机这半边（纯 cv2/numpy 的回贴、接地、投票、蒙版编解码）是否就绪。

    刻意不含模型判据：分割权重在不在服务机上，跟「识别能不能用」已经无关
    （推理一律派到节点），拿它当判据会把只依赖投票的远端分区路一起拦死。
    """
    try:
        import cv2  # noqa: F401
        import numpy  # noqa: F401
    except Exception:
        return False
    return True


def _imports():
    import cv2
    import numpy as np
    return cv2, np


def _blur(cv2, a, sigma):
    return cv2.GaussianBlur(a.astype("float32"), (0, 0), sigma)


def _resize_to_side(image, side):
    width, height = image.size
    scale = side / max(width, height)
    if scale >= 1:
        return image
    return image.resize((max(1, round(width * scale)), max(1, round(height * scale))),
                        Image.LANCZOS)


def segment_persons(image, min_area_ratio=MIN_PERSON_AREA_RATIO):
    """整图抠人，按连通域拆成一个个候选，按质心横坐标确定性排序（p1 最左）。

    min_area_ratio 过滤占比太小的连通域（误检小团）；灵敏度档位由调用方换算。
    返回 [{box, mask, coverage, cx}]，mask 为与 image 同尺寸的 float32 软蒙版。
    """
    cv2, np = _imports()
    from rembg import new_session, remove

    work = _resize_to_side(image.convert("RGB"), PREVIEW_SIDE)
    width, height = work.size
    session = new_session("u2net_human_seg")
    alpha = remove(work, session=session).split()[-1]
    a = np.asarray(alpha).astype("float32") / 255.0
    binary = (a > 0.5).astype("uint8")
    # 轻微膨胀把同一个人被抠断的手脚连起来，再拆连通域，避免一个人裂成多个候选。
    joined = cv2.dilate(binary, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    count, labels, stats, centroids = cv2.connectedComponentsWithStats(joined, connectivity=8)
    floor = max(64, int(width * height * min_area_ratio))
    people = []
    for index in range(1, count):
        area = int(stats[index, cv2.CC_STAT_AREA])
        if area < floor:
            continue
        component = labels == index
        mask = _blur(cv2, a * component, 1.2)
        x, y, w, h = (int(v) for v in stats[index, :4])
        people.append({
            "box": [x / width, y / height, (x + w) / width, (y + h) / height],
            "mask": mask,
            "coverage": area / (width * height),
            "cx": float(centroids[index][0]) / width,
        })
    people.sort(key=lambda person: person["cx"])
    return people


# ---- 逐人实例分割（生产链）：YOLO person-seg @640 → 补洞闭运算 → 人脸锚点补漏 ----
# 与原型页烘焙链（lighting-multi/tmp/bake-local-seeds.py）同一套参数与规则。
# 权重用 CHOUKA_SEG_MODELS 指目录（默认 server/models/），只补漏不精修；
# SAM2 就绪才做补漏，缺 SAM2 时退化为纯 YOLO 检出，不影响主路。
SEG_PERSON_MODEL = "person_yolov8m-seg.pt"
SEG_FACE_MODEL = "face_yolov8m.pt"
SEG_SAM2_MODEL = "sam2.1_hiera_small.pt"
SEG_SAM2_CONFIG = "configs/sam2.1/sam2.1_hiera_s.yaml"
SEG_IMGSZ = 640
SEG_CONF = 0.3
_SEG_CACHE = {}
# SAM2 predictor 是进程级单例，set_image 与 predict 之间没有自己的锁：
# 面板识别与出图并发时后一次 set_image 会盖掉前一次，出图拿到别人图的蒙版
# （同尺寸不报错，实测 6 次并发崩 2 次）。手工分割会让并发变成常态，这里串行化。
_SAM_LOCK = threading.Lock()


def _seg_dir():
    return os.environ.get("CHOUKA_SEG_MODELS") or os.path.join(os.path.dirname(__file__), "models")


def _seg_weights():
    person = os.path.join(_seg_dir(), os.environ.get("CHOUKA_SEG_PERSON", SEG_PERSON_MODEL))
    face = os.path.join(_seg_dir(), SEG_FACE_MODEL)
    return (person if os.path.isfile(person) else None,
            face if os.path.isfile(face) else None)


def yolo_available():
    """实例分割主路是否就绪：ultralytics 可导入且人物权重在位（人脸权重缺失只影响补漏）。"""
    try:
        import ultralytics  # noqa: F401
    except Exception:
        return False
    person, _face = _seg_weights()
    return person is not None


def rembg_available():
    try:
        import rembg  # noqa: F401
        return True
    except Exception:
        return False


def legacy_segmentation_ready():
    """服务机自己开模型跑分割的老路是否可用（Spec M2-11/M2-15：派发上线后整段下架）。

    它只回答「这台机器自己算得动吗」，不回答「识别能不能用」——后者是集群判据，
    在 cloud_lighting.perception_block。两者混成一把尺子就是这次 501 的成因。
    """
    return yolo_available() or rembg_available()


def _seg_yolo(path):
    if path not in _SEG_CACHE:
        from ultralytics import YOLO
        _SEG_CACHE[path] = YOLO(path)
    return _SEG_CACHE[path]


def _seg_sam():
    if "sam" not in _SEG_CACHE:
        sam = None
        try:
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor
            ckpt = os.path.join(_seg_dir(), SEG_SAM2_MODEL)
            if os.path.isfile(ckpt):
                sam = SAM2ImagePredictor(build_sam2(SEG_SAM2_CONFIG, ckpt, device="cpu"))
        except Exception:
            sam = None
        _SEG_CACHE["sam"] = sam
    return _SEG_CACHE["sam"]


def _seg_postfix(cv2, np, m):
    """实例蒙版后处理：外轮廓补洞 + 3x3 闭运算（生产定案配置）。"""
    m = (m > 0.5).astype("uint8")
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(m)
    if contours:
        cv2.drawContours(filled, contours, -1, 1, cv2.FILLED)
    return cv2.morphologyEx(filled, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


def _seg_recover_faces(cv2, np, img, masks, face_path, sam):
    """人脸锚点补漏：检出的人脸没被任何人物蒙版盖住 = 漏检，扩框让 SAM2 补一块。只补漏不精修。

    跳过两类脸：中心落在已检出人物包围盒内的（已检出的人面具没盖到脸，
    低头/侧脸/小脸，补了会切出同一人碎片）；以及小人脸（<0.5% 图宽，
    大图上一两百像素的妆花/兽纹对脸模型就是"脸"，扩框会切出上半身碎片）。
    补出的块必须过与检出一致的最小面积线（脸旁边误报扩出的碎片巴掌大，
    真人再小也不可能只有脸的十倍以内）。
    """
    if sam is None:
        return []
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = img.shape[:2]
    union = np.zeros((height, width), np.uint8)
    boxes = []
    for m in masks:
        union |= m
        ys, xs = np.nonzero(m)
        if len(xs):
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    recovered = []
    face_boxes = []
    floor = max(200, int(width * height * MIN_PERSON_AREA_RATIO))
    result = _seg_yolo(face_path).predict(img, imgsz=SEG_IMGSZ, conf=SEG_CONF, verbose=False)[0]
    if result.boxes is None:
        return recovered
    with _SAM_LOCK:
        sam.set_image(rgb)
        for b in result.boxes.xyxy.cpu().numpy():
            x0, y0, x1, y1 = (int(v) for v in b)
            if union[y0:y1, x0:x1].mean() > 0.5:
                continue
            fcx, fcy = (x0 + x1) / 2, (y0 + y1) / 2
            if any(bx0 <= fcx <= bx1 and by0 <= fcy <= by1 for bx0, by0, bx1, by1 in boxes):
                continue
            fw, fh = x1 - x0, y1 - y0
            if fw < width * 0.005 or fh < height * 0.005:
                continue
            bx0, by0 = max(0, x0 - 2 * fw), max(0, y0 - int(1.5 * fh))
            bx1, by1 = min(width, x1 + 2 * fw), min(height, y1 + 6 * fh)
            pm, _, _ = sam.predict(box=np.array([[bx0, by0, bx1, by1]]), multimask_output=False)
            mm = _seg_postfix(cv2, np, pm[0].astype("float32"))
            if mm.sum() > floor:
                recovered.append(mm)
                face_boxes.append((fcx, fcy, fw))
    kept = []
    kept_faces = []
    accepted = np.zeros((height, width), np.uint8)
    for mm, (fcx, fcy, fw) in sorted(
            zip(recovered, face_boxes), key=lambda pair: -int(pair[0].sum())):
        total = int(mm.sum())
        if total and float(np.logical_and(accepted, mm).sum()) / total > 0.5:
            continue
        if any((fcx - kx) ** 2 + (fcy - ky) ** 2 < ((fw + kw) / 2) ** 2
               for kx, ky, kw in kept_faces):
            continue
        kept.append(mm)
        kept_faces.append((fcx, fcy, fw))
        accepted |= mm
    return kept


def segment_persons_yolo(image, min_area_ratio=MIN_PERSON_AREA_RATIO):
    """逐人实例分割：YOLO person-seg 每人一张蒙版，贴在一起的人也能分开。

    与 segment_persons 同结构、同排序（质心横坐标，p1 最左），识别与出图回放
    都走本函数时候选 id 稳定可对。
    """
    cv2, np = _imports()
    person_path, face_path = _seg_weights()
    img = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    height, width = img.shape[:2]
    result = _seg_yolo(person_path).predict(img, imgsz=SEG_IMGSZ, conf=SEG_CONF, verbose=False)[0]
    floor = max(64, int(width * height * min_area_ratio))
    masks = []
    if result.masks is not None:
        for m in result.masks.data.cpu().numpy():
            mm = cv2.resize(m, (width, height), interpolation=cv2.INTER_LINEAR)
            mm = _seg_postfix(cv2, np, mm)
            if mm.sum() > floor:
                masks.append(mm)
    if face_path:
        masks.extend(_seg_recover_faces(cv2, np, img, masks, face_path, _seg_sam()))
    people = []
    for m in masks:
        ys, xs = np.nonzero(m)
        if not len(xs):
            continue
        people.append({
            "box": [xs.min() / width, ys.min() / height,
                    (xs.max() + 1) / width, (ys.max() + 1) / height],
            "mask": _blur(cv2, m.astype("float32"), 1.2),
            "coverage": float(m.sum()) / (width * height),
            "cx": float(xs.mean()) / width,
        })
    people.sort(key=lambda person: person["cx"])
    return people


def segment_auto(image, min_area_ratio=MIN_PERSON_AREA_RATIO):
    """识别主路：实例分割就绪走 YOLO 逐人链，否则回退整图抠图连通域。"""
    if yolo_available():
        return segment_persons_yolo(image, min_area_ratio=min_area_ratio)
    return segment_persons(image, min_area_ratio=min_area_ratio)


# ---- 大模型颜色分区 → 逐人候选（远端识别路，与原型页同一套口径） ----
# 云端 /images/edits 用分区提示词出「每人一纯色、背景纯黑」的颜色图，
# 这里 kmeans 取色块、近黑整簇丢弃、连通域面积过滤后汇成一份身份索引层，
# 候选蒙版、缓存、框选投票都从这份层派生；坐标全程归一化。
PARTITION_PROMPT = ("把这张图重新渲染成颜色分区图：每个可见的人用一个不同的纯色填满全身"
                    "（红、绿、蓝、黄、紫、青），背景纯黑，人物之间不要同色，"
                    "构图和姿态保持与输入图完全一致。")
PARTITION_K = 6
PARTITION_MAX_SAMPLES = 20000
PARTITION_MIN_LUMA = 30.0
# 索引层只有 8 位：一个号一位身份，255 用完就没了（0 留给背景）。
PARTITION_MAX_IDS = 255
# 框内众数身份至少要占多少非背景像素才敢落身份，低于它宁可让用户本地补选。
REGION_MIN_SHARE = 0.6


def _partition_clusters(img):
    """分区图 → (簇心, 逐像素簇号)：近黑背景簇不在这里丢，调用方按亮度过滤。

    超过 600 万像素先整体压下来，逐像素归类的内存才稳。
    """
    cv2, np = _imports()
    height, width = img.shape[:2]
    if width * height > 6_000_000:
        scale = (6_000_000 / (width * height)) ** 0.5
        img = cv2.resize(img, (max(1, int(width * scale)), max(1, int(height * scale))),
                         interpolation=cv2.INTER_AREA)
        height, width = img.shape[:2]
    pixels = img.reshape(-1, 3).astype(np.float32)
    step = max(1, len(pixels) // PARTITION_MAX_SAMPLES)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _compact, _labels, centers = cv2.kmeans(
        pixels[::step], PARTITION_K, None, criteria, 3, cv2.KMEANS_PP_CENTERS)
    assign = ((pixels[:, None, :] - centers[None, :, :]) ** 2).sum(axis=2).argmin(axis=1)
    return img, centers, assign.reshape(height, width)


def _scale_index(label, size):
    """索引层缩放到 size=(宽, 高)：放大只 nearest，缩小按面积逐身份投票。

    整数索引场不能直接插值：滤波会在相邻身份之间造出第三种值，等于凭空多出身份。
    """
    cv2, np = _imports()
    width, height = size
    if label.shape == (height, width):
        return np.ascontiguousarray(label, np.uint8)
    if label.shape[0] * label.shape[1] < width * height:
        grown = cv2.resize(label, (width, height), interpolation=cv2.INTER_NEAREST)
        return np.asarray(grown, np.uint8)
    out = np.zeros((height, width), np.uint8)
    for value in np.unique(label):
        if value == 0:
            continue
        share = cv2.resize((label == value).astype(np.float32), (width, height),
                           interpolation=cv2.INTER_AREA)
        out[share > 0.5] = value
    return out


def partition_index_layer(partition_image, *, target_size=None,
                          min_area_ratio=MIN_PERSON_AREA_RATIO):
    """颜色分区图 → 单通道身份索引层（0=背景，1..255 按从左到右稳定编号）。

    同色两个人靠连通域各占一号；面积不到 floor 的碎块不进层；
    过线但号位不够的记进 dropped，不静默丢弃。
    蒙版、缓存、框选投票都用这一份层，避免各处各解一遍结果对不上。
    """
    cv2, np = _imports()
    img = cv2.cvtColor(np.asarray(partition_image.convert("RGB")), cv2.COLOR_RGB2BGR)
    img, centers, assign = _partition_clusters(img)
    height, width = img.shape[:2]
    floor = max(64, int(width * height * min_area_ratio))

    groups = []   # [(连通域数组, cx, 面积)]，一个色块一个连通域
    for k in range(PARTITION_K):
        b, g, r = (float(v) for v in centers[k])
        if 0.114 * b + 0.587 * g + 0.299 * r < PARTITION_MIN_LUMA:
            continue  # 近黑 = 背景整簇丢弃
        cluster = (assign == k).astype(np.uint8)
        count, components = cv2.connectedComponents(cluster, connectivity=8)
        for index in range(1, count):
            solid = components == index
            area = int(solid.sum())
            if area <= floor:
                continue
            ys, xs = np.nonzero(solid)
            if not len(xs):
                continue
            groups.append((solid, float(xs.mean()) / width, area))
    groups.sort(key=lambda group: group[1])
    dropped = [{"area": area, "cx": cx, "reason": "id_overflow"}
               for _solid, cx, area in groups[PARTITION_MAX_IDS:]]

    label = np.zeros((height, width), np.int32)
    for next_id, (solid, _cx, _area) in enumerate(groups[:PARTITION_MAX_IDS], 1):
        label[solid] = next_id
    layer = _scale_index(label, target_size) if target_size else label.astype(np.uint8)

    final_h, final_w = layer.shape
    entries = []
    for index in range(1, int(layer.max()) + 1):
        ys, xs = np.nonzero(layer == index)
        entries.append({
            "index": index,
            "box": [xs.min() / final_w, ys.min() / final_h,
                    (xs.max() + 1) / final_w, (ys.max() + 1) / final_h],
            "coverage": float(len(xs)) / (final_w * final_h),
            "cx": float(xs.mean()) / final_w,
        })
    return {"layer": layer, "entries": entries, "dropped": dropped}


def layer_to_candidates(layer, entries):
    """身份索引层 + 索引层条目 → 逐身份 (条目, 软蒙版)：边缘与 partition_candidates 同一档。"""
    cv2, np = _imports()
    return [(entry, _blur(cv2, (layer == entry["index"]).astype(np.float32), 1.2))
            for entry in entries]


def partition_candidates(partition_image, *, target_size=None,
                         min_area_ratio=MIN_PERSON_AREA_RATIO):
    """颜色分区图 → 逐人候选列表，结构与 segment_persons 一致（box/mask/coverage/cx）。

    target_size 给 (宽, 高) 时蒙版放大回原图尺寸；缺省按分区图尺寸出蒙版。
    """
    result = partition_index_layer(partition_image, target_size=target_size,
                                   min_area_ratio=min_area_ratio)
    return [{"box": entry["box"], "mask": mask, "coverage": entry["coverage"],
             "cx": entry["cx"]}
            for entry, mask in layer_to_candidates(result["layer"], result["entries"])]


def region_index_vote(layer, box, *, min_share=REGION_MIN_SHARE):
    """在索引层里对框选区域做身份投票：非背景像素取众数，占比够高才落身份。

    返回 status=ok/empty/unreliable：
    ok 给框内该身份的实心蒙版（框外一律 0，裁不裁由编辑器决定）；
    empty = 框内全是背景，unreliable = 多个身份挤在一起分不开，宁可让用户本地补选。
    """
    cv2, np = _imports()
    height, width = layer.shape
    x0, y0, x1, y1 = (int(round(v * s)) for v, s in zip(box, (width, height, width, height)))
    x0, y0 = max(0, min(x0, width - 1)), max(0, min(y0, height - 1))
    x1, y1 = max(x0 + 1, min(x1, width)), max(y0 + 1, min(y1, height))
    region = layer[y0:y1, x0:x1]
    solid = region[region > 0]
    pixel_box = [x0 / width, y0 / height, x1 / width, y1 / height]
    if solid.size == 0:
        return {"status": "empty", "box": pixel_box,
                "message": "这块框里没有大模型分出的身份，请贴着人重新框选或改用本地补选"}
    ids, counts = np.unique(solid, return_counts=True)
    top = int(ids[int(counts.argmax())])
    share = float(counts.max()) / int(solid.size)
    if share < min_share:
        return {"status": "unreliable", "box": pixel_box, "share": share,
                "message": "该区域分区不可靠，请本地补选"}
    mask = np.zeros((height, width), np.float32)
    mask[y0:y1, x0:x1] = (region == top)
    return {"status": "ok", "index": top, "share": share, "box": pixel_box, "mask": mask,
            "coverage": float((mask > 0).sum()) / (width * height)}


def segment_box(image, box):
    """在归一化框内做通用分割并精修边界，返回整图尺寸的软蒙版与覆盖率。"""
    cv2, np = _imports()
    from rembg import new_session, remove

    work = image.convert("RGB")
    width, height = work.size
    x0, y0, x1, y1 = (int(round(v * s)) for v, s in zip(box, (width, height, width, height)))
    x0, y0 = max(0, min(x0, width - 1)), max(0, min(y0, height - 1))
    x1, y1 = max(x0 + 1, min(x1, width)), max(y0 + 1, min(y1, height))
    crop = work.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    session = new_session("u2net")
    alpha = remove(crop, session=session).split()[-1].resize((cw, ch), Image.BILINEAR)
    a = np.asarray(alpha).astype("float32") / 255.0
    gc = np.full((ch, cw), cv2.GC_PR_BGD, np.uint8)
    gc[a > 0.55] = cv2.GC_PR_FGD
    gc[a < 0.06] = cv2.GC_BGD
    gc[a > 0.85] = cv2.GC_FGD
    # 框内全是前景（或全是背景）时 GrabCut 没有样本会崩，直接用抠图阈值兜底。
    has_fore = bool(((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)).any())
    has_back = bool(((gc == cv2.GC_BGD) | (gc == cv2.GC_PR_BGD)).any())
    if has_fore and has_back:
        bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
        cv2.grabCut(cv2.cvtColor(np.asarray(crop), cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 5,
                    cv2.GC_INIT_WITH_MASK)
        refined = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1.0, 0.0).astype("float32")
    else:
        refined = (a > 0.5).astype("float32")
    refined = _blur(cv2, refined, 1.2)
    full = np.zeros((height, width), np.float32)
    full[y0:y1, x0:x1] = refined
    coverage = float((refined > 0.5).sum()) / (width * height)
    return {"box": [x0 / width, y0 / height, x1 / width, y1 / height],
            "mask": full, "coverage": coverage}


POINT_WINDOW = (0.40, 0.55)


def segment_point(image, point, window=POINT_WINDOW):
    """点选分割：以点击处为确定前景，在裁窗内 GrabCut 出被点的那一块。

    多人合照时 rembg 会把贴在一起的人抠成一整片，整图连通域分不开；
    这里用点击位置当前景种子，裁一小块窗口单独抠，避开旁边的邻居。
    窗口内抠准之后，再沿这一个人自己的列把蒙版延伸到全身。
    """
    cv2, np = _imports()
    from rembg import new_session, remove

    work = image.convert("RGB")
    width, height = work.size
    px, py = float(point[0]), float(point[1])
    half_w = window[0] * width / 2
    half_h = window[1] * height / 2
    x0 = int(max(0, min(width - 1, px * width - half_w)))
    y0 = int(max(0, min(height - 1, py * height - half_h)))
    x1 = int(max(x0 + 8, min(width, px * width + half_w)))
    y1 = int(max(y0 + 8, min(height, py * height + half_h)))
    crop = work.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    session = new_session("u2net_human_seg")
    alpha = remove(crop, session=session).split()[-1].resize((cw, ch), Image.BILINEAR)
    a = np.asarray(alpha).astype("float32") / 255.0
    gc = np.full((ch, cw), cv2.GC_PR_BGD, np.uint8)
    gc[a > 0.6] = cv2.GC_PR_FGD
    gc[a < 0.15] = cv2.GC_BGD
    cx = int(min(cw - 1, max(0, px * width - x0)))
    cy = int(min(ch - 1, max(0, py * height - y0)))
    cv2.circle(gc, (cx, cy), max(2, int(min(cw, ch) * 0.035)), cv2.GC_FGD, -1)
    # 裁窗四边当确定背景，GrabCut 才有背景样本可学。
    border = max(1, int(min(cw, ch) * 0.03))
    gc[:border, :] = cv2.GC_BGD
    gc[-border:, :] = cv2.GC_BGD
    gc[:, :border] = cv2.GC_BGD
    gc[:, -border:] = cv2.GC_BGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(cv2.cvtColor(np.asarray(crop), cv2.COLOR_RGB2BGR), gc, None, bgd, fgd, 6,
                cv2.GC_INIT_WITH_MASK)
    binary = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 1.0, 0.0).astype("uint8")
    # 只留点击处那一块，别把窗口里别的东西也带上。
    count, labels, _stats, _cent = cv2.connectedComponentsWithStats(binary, connectivity=8)
    keep = int(labels[cy, cx])
    picked = (labels == keep).astype("float32") if keep > 0 else binary.astype("float32")
    full = np.zeros((height, width), np.float32)
    full[y0:y1, x0:x1] = picked
    full = _extend_along_column(cv2, np, full, work, session, remove)
    refined = _blur(cv2, full, 1.2)
    ys, xs = np.nonzero(refined > 0.5)
    if len(xs):
        box = [xs.min() / width, ys.min() / height, (xs.max() + 1) / width, (ys.max() + 1) / height]
    else:
        box = [x0 / width, y0 / height, x1 / width, y1 / height]
    coverage = float((refined > 0.5).sum()) / (width * height)
    return {"box": box, "mask": refined, "coverage": coverage}


def _extend_along_column(cv2, np, mask, image, session, remove):
    """把窗口内抠出的那一块沿自己的列往下延伸成全身，不吃到旁边的人。

    窗口只有半张图高，抠出来的只是上半身；这里用整图 rembg 的 alpha 补全下半身，
    但只取这个人自己那一列的像素，再只保留与窗口内蒙版连通的那些，
    所以相邻的人不会跟着长进来。
    """
    width, height = image.size
    inside = mask > 0.5
    ys, xs = np.nonzero(inside)
    if not len(xs):
        return mask
    alpha = remove(image, session=session).split()[-1].resize((width, height), Image.BILINEAR)
    a = np.asarray(alpha).astype("float32") / 255.0
    band = a.copy()
    band[:, :max(0, int(xs.min()) - 6)] = 0
    band[:, min(width, int(xs.max()) + 7):] = 0
    band[inside] = 1.0
    grown = (band > 0.5).astype("uint8")
    count, labels = cv2.connectedComponents(grown, connectivity=8)
    seeds = {int(v) for v in labels[ys, xs]}
    seeds.discard(0)
    if not seeds:
        return mask
    return np.isin(labels, list(seeds)).astype("float32")


def mask_to_data_url(mask, side=PREVIEW_SIDE):
    """把 float32 蒙版编码成灰度 PNG data URL，长边压到 side 以内供前端预览。"""
    import numpy as np

    array = (np.clip(mask, 0, 1) * 255).astype("uint8")
    image = Image.fromarray(array, mode="L")
    image = _resize_to_side(image, side)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def load_rgb(data):
    """字节 → 转正的 RGB 图：手机/微信传来的图带 EXIF 方向，不转正的话蒙版和像素会转 90°。

    全链原来只有上传那处做转正（app.py 的 exif_transpose），识别入口直接
    Image.open().convert("RGB") 就喂模型，导致同一张图「看到的」和「识别到的」方向不一致。
    """
    from io import BytesIO

    from PIL import Image, ImageOps

    return ImageOps.exif_transpose(Image.open(BytesIO(data))).convert("RGB")


class MaskSizeMismatch(ValueError):
    """蒙版/索引层尺寸和它对的那张图不符。

    继承 ValueError 让既有捕获继续生效；单独立类是为了在 HTTP 边界翻成
    「请回面板重新识别」这种人话，而不是笼统一条 500。
    """


def layer_source_size(data):
    """索引层 PNG 自己的尺寸（宽, 高）：收节点回传的层时先量这一把，别急着解码。

    `decode_identity_layer` 内部会按最近邻缩放对齐到目标尺寸，先解码再查就永远查不出问题，
    所以这道尺子必须读文件头、在解码之前做。
    """
    from io import BytesIO

    from PIL import Image

    with Image.open(BytesIO(data)) as image:
        return image.size


def check_layer_size(layer, size):
    """节点回传的索引层必须与原图逐像素同尺寸（size=宽,高）；差 1 像素也算不合格。

    识别阶段没有任何缩放需求，收到不同尺寸的层只可能是链路中途把图缩过；
    这里不 resample：_scale_index 会把边缘身份按面积投票掉，错得看不出来又对不上号。
    """
    height, width = layer.shape[:2]
    target = (int(size[0]), int(size[1]))
    if (width, height) != target:
        raise MaskSizeMismatch(
            f"识别结果尺寸 {width}x{height} 与原图 {target[0]}x{target[1]} 不符")
    return layer


def decode_mask(data, size, *, resample=None):
    """把上传的灰度蒙版解码成目标尺寸数组；白=打光范围。

    尺寸不符默认直接报错，不静默拉伸：蒙版是逐像素对齐用的，拉伸等于把打光范围整体挪位，
    差一两像素肉眼看不出来、出了图才知道错。确实要重采样（编辑器粗蒙版放大到出图尺寸）
    必须显式传 resample="lanczos" 或 "nearest"。
    """
    import numpy as np

    width, height = size
    image = Image.open(BytesIO(data)).convert("L")
    if image.size != (width, height):
        if resample is None:
            raise MaskSizeMismatch(
                f"蒙版尺寸 {image.size[0]}x{image.size[1]} 与目标 {width}x{height} 不符，"
                "已拒绝拉伸；请回面板重新识别后再出图")
        image = image.resize((width, height),
                             Image.LANCZOS if resample == "lanczos" else Image.NEAREST)
    return np.asarray(image).astype("float32") / 255.0


def encode_identity_layer(layer):
    """身份索引层 uint8 → PNG 字节（无损，缓存和落盘都用它）。"""
    np = _imports()[1]
    buffer = BytesIO()
    Image.fromarray(np.asarray(layer, "uint8"), mode="L").save(buffer, format="PNG")
    return buffer.getvalue()


def decode_identity_layer(data, target_size):
    """身份索引层 PNG → (高, 宽) uint8：0 是背景，1..255 是身份号。

    缩放规则见 _scale_index：整数索引场不能插值，否则会在相邻身份之间造出第三种值。
    """
    np = _imports()[1]
    # 只认 R 通道：前端用 RGBA 承载索引号，L / P / RGB 走 convert("RGB") 同样落在 R 上。
    layer = np.asarray(Image.open(BytesIO(data)).convert("RGB"))[:, :, 0]
    return _scale_index(layer, target_size)


def union_mask(masks, shape):
    import numpy as np

    if not masks:
        return np.zeros(shape, np.float32)
    return np.maximum.reduce([np.asarray(m, np.float32) for m in masks])


def background_light(base, relit, solid, sigma):
    """轮廓外的低频光照比只用背景像素求（归一化卷积），把人物排除在模糊窗口之外。

    不排除的话，人物一被压暗，这份暗就会顺着模糊窗口漏到紧挨轮廓的背景上，
    绕着人形成一圈暗边——看起来像贴纸。
    """
    cv2, np = _imports()
    base = np.asarray(base, np.float32)
    relit = np.asarray(relit, np.float32)
    if base.ndim == 2:
        base = base[..., None]
    if relit.ndim == 2:
        relit = relit[..., None]
    bg = 1.0 - np.asarray(solid, np.float32)
    den = np.maximum(_blur(cv2, bg, sigma), 1e-3)[..., None]
    num = _blur(cv2, relit * bg[..., None], sigma) / den
    ref = _blur(cv2, base * bg[..., None], sigma) / den
    ratio = np.clip(num / np.maximum(ref, 1.0), FACE_GUARD["floor"], FACE_GUARD["ceil"])
    return np.clip(base * ratio, 0, 255).astype("uint8")


def composite(base, relit, mask, edge="soft", falloff=None, ring_frac=None):
    """只把重打光结果搬进蒙版内；soft 按距离指数衰减保留贴边轮廓光，tight 硬边膨胀。

    轮廓外圈只搬低频光照，不贴模型像素：直接贴会把背景内容一起换掉。
    falloff 是柔和边缘的衰减宽度（px），ring_frac 是这圈低频的半径占画面短边的比例。
    """
    cv2, np = _imports()
    falloff = EDGE_FALLOFF if falloff is None else float(falloff)
    base = np.asarray(base, np.float32)
    relit = np.asarray(relit, np.float32)
    mask = np.asarray(mask, np.float32)
    solid = (mask > 0.5).astype("uint8")
    if edge == "soft":
        distance = cv2.distanceTransform(1 - solid, cv2.DIST_L2, 5)
        weight = np.where(solid == 1, mask, np.exp(-(distance - 0.5) / falloff) * 0.85)
        weight = _blur(cv2, weight, 1.0).astype("float32")
    else:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
        weight = _blur(cv2, cv2.dilate(mask, kernel), 3.5).astype("float32")
    ring_sigma = max(1.0, min(base.shape[:2]) *
                     (RING_SIGMA_FRAC if ring_frac is None else float(ring_frac)))
    photo = background_light(base, relit, solid, ring_sigma)
    target = np.where(solid[..., None] == 1, relit, photo.astype("float32"))
    weight = np.clip(weight, 0, 1)[..., None]
    out = base * (1 - weight) + target * weight
    return np.clip(out, 0, 255).astype("uint8")


def _contact_shadow(cv2, np, mask, height, width, slope, params):
    ys = np.arange(height, dtype="float32")[:, None].repeat(width, axis=1)
    xs = np.arange(width, dtype="float32")[None, :].repeat(height, axis=0)
    solid = mask > 0.5
    has = solid.any(axis=0)
    lowest = np.where(has, height - 1 - np.argmax(solid[::-1], axis=0), height).astype("float32")
    low_row = lowest[None, :].repeat(height, axis=0)
    drop = np.maximum(ys - low_row, 0.0)
    src = np.clip(xs + slope * drop, 0, width - 1).astype("int32")
    low_src = np.take_along_axis(low_row, src, axis=1)
    dd = ys - low_src
    s = np.where((dd >= 1) & (dd <= params["maxdrop"]),
                 np.exp(-np.clip(dd, 0, None) / params["decay"]), 0.0)
    s = _blur(cv2, s.astype("float32"), params["sigma"])
    return s * params["strength"] * (1.0 - mask)


def grounding(out, base, mask, key_azimuth=None, shadow_strength=None, pool_strength=None):
    """接地：抑制下半身光晕 + 贴脚接触阴影 + 脚下柔和压暗。只动蒙版外脚下地面。

    投影方向由主光方位角推出：slope = -0.8*cos(azimuth)，夹在 ±0.9。
    key_azimuth 为空 = 沿用原图光，没有方向可依据，坡向取 0（左右对称压暗），
    不拿一个写死的角度在原图脚下造出一道本来不存在的斜影。
    shadow_strength / pool_strength 是面板上的「接触阴影」和「脚下压暗」，缺省用内置档。
    扬尘/薄雾是特定场景效果，不属于通用链路，这里不做。
    """
    cv2, np = _imports()
    out = np.asarray(out, np.float32).copy()
    base = np.asarray(base, np.float32)
    mask = np.asarray(mask, np.float32)
    height, width = mask.shape
    ys = np.arange(height, dtype="float32")[:, None].repeat(width, axis=1)
    slope = 0.0 if key_azimuth is None else max(
        -0.9, min(0.9, -SHADOW["slope_scale"] * math.cos(math.radians(key_azimuth))))
    shadow_params = dict(SHADOW,
                         strength=SHADOW["strength"] if shadow_strength is None
                         else float(shadow_strength))
    pool_strength = POOL["strength"] if pool_strength is None else float(pool_strength)

    binary = (mask > 0.35).astype("uint8")
    core = cv2.erode(binary, cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE, (HALO["core"] * 2 + 1,) * 2))
    ring = np.clip(binary.astype("float32") - core.astype("float32"), 0, 1)
    ring = _blur(cv2, ring, 2.0) * np.clip((ys / height - HALO["start"]) / 0.12, 0, 1)
    excess = (out.max(axis=2) - base.max(axis=2) - HALO["over"]) / HALO["span"]
    t = np.clip(excess, 0, 1) * HALO["strength"] * ring
    out = out * (1 - t[..., None]) + base * t[..., None]

    shadow = _contact_shadow(cv2, np, mask, height, width, slope, shadow_params)
    out *= (1.0 - shadow[..., None])

    feet = ((mask > 0.5) & (ys > 0.82 * height)).astype("float32")
    feet = cv2.dilate(feet, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
    pool = _blur(cv2, feet, POOL["sigma"])
    cast = np.roll(np.roll(feet, 14, axis=0), -26, axis=1)
    pool = np.maximum(pool, _blur(cv2, cast, 30) * 0.7)
    pool *= pool_strength * (1.0 - mask)
    out *= (1.0 - pool[..., None])
    return np.clip(out, 0, 255).astype("uint8")


def head_box(person_box, ratio=HEAD_RATIO):
    """人物包围盒上部 ratio 区域作为头肩裁切，返回归一化框。"""
    x0, y0, x1, y1 = person_box
    return [x0, y0, x1, y0 + (y1 - y0) * ratio]


def head_weight(mask, box, shape, sigma=18.0):
    """头肩羽化权重：裁切框内椭圆软边，再与人物蒙版相交，避免贴到背景。"""
    cv2, np = _imports()
    height, width = shape
    x0, y0, x1, y1 = (int(round(v * s)) for v, s in zip(box, (width, height, width, height)))
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    rx, ry = max(1, (x1 - x0) // 2), max(1, (y1 - y0) // 2)
    ellipse = np.zeros((height, width), np.uint8)
    cv2.ellipse(ellipse, (cx, cy), (rx, ry), 0, 0, 360, 255, -1)
    weight = _blur(cv2, ellipse.astype("float32") / 255.0, sigma)
    return np.clip(weight * (np.asarray(mask, np.float32) > 0.5), 0, 1)


def blend_head(base, model_crop, box, weight):
    """只搬模型的低频光影差到原图裁切，细节仍用原图像素，避免整块贴回发糊。"""
    cv2, np = _imports()
    base = np.asarray(base, np.float32).copy()
    height, width = base.shape[:2]
    x0, y0, x1, y1 = (int(round(v * s)) for v, s in zip(box, (width, height, width, height)))
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(width, x1), min(height, y1)
    if x1 <= x0 or y1 <= y0:
        return np.clip(base, 0, 255).astype("uint8")
    crop = base[y0:y1, x0:x1]
    model = np.asarray(model_crop.convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS),
                       np.float32)
    shade = _blur(cv2, model, SHADE_SIGMA) - _blur(cv2, crop, SHADE_SIGMA)
    patched = np.clip(crop + shade, 0, 255)
    w = np.asarray(weight, np.float32)[y0:y1, x0:x1][..., None]
    base[y0:y1, x0:x1] = crop * (1 - w) + patched * w
    return np.clip(base, 0, 255).astype("uint8")


def preserve_shape(base, lit, weight, sigma=None, sigma_frac=None):
    """只把 lit 的低频光照比乘到 base 上：五官、发丝这些高频一律保留 base 的像素。

    云端整图重打光会把脸重新画一遍，直接贴像素必然变形；这里搬明暗与色温，不搬形状。
    weight 处用搬光结果替换 lit，weight 为 0 的地方原样退回 lit。
    sigma 缺省按作用区域短边取（约 1/4 边长，比五官大、比整张脸小）。
    """
    cv2, np = _imports()
    base = np.asarray(base, np.float32)
    lit = np.asarray(lit, np.float32)
    if base.ndim == 2:
        base = base[..., None]
    if lit.ndim == 2:
        lit = lit[..., None]
    weight = np.clip(np.asarray(weight, np.float32), 0, 1)
    if sigma is None:
        ys, xs = np.nonzero(weight > 0.5)
        if len(xs) < 2:
            return np.clip(lit, 0, 255).astype("uint8")
        short = min(int(xs.max() - xs.min()) + 1, int(ys.max() - ys.min()) + 1)
        sigma = short * (FACE_GUARD["sigma_frac"] if sigma_frac is None else float(sigma_frac))
    floor, ceil = FACE_GUARD["floor"], FACE_GUARD["ceil"]
    ratio = np.clip(_blur(cv2, lit, sigma) /
                    np.maximum(_blur(cv2, base, sigma), 1.0), floor, ceil)
    kept = np.clip(base * ratio, 0, 255)
    w = weight[..., None]
    return np.clip(lit * (1 - w) + kept * w, 0, 255).astype("uint8")


def face_guard(base, out, mask, person_boxes, head_ratio=None, sigma_frac=None):
    """把每个人物头部区域恢复成「原图像素 × 当前低频光照」，避免模型重绘五官造成脸变形。

    只处理人物蒙版内的头部椭圆，边缘做羽化，所以背景与身体上的高光不受影响。
    head_ratio 决定这块区域占人物身高的比例，sigma_frac 决定搬过来的光有多粗颗粒。
    """
    _, np = _imports()
    result = np.asarray(out)
    height, width = np.asarray(mask).shape[:2]
    for person in person_boxes:
        box = head_box(person, FACE_GUARD["ratio"] if head_ratio is None else head_ratio)
        px_h = max(1, round((box[3] - box[1]) * height))
        weight = head_weight(mask, box, (height, width), sigma=max(4.0, px_h / 14.0))
        result = preserve_shape(base, result, weight, sigma_frac=sigma_frac)
    return result


def tint_match(out, mask, amount=None):
    """把人物的低频颜色往它周围的环境靠，亮度不动。

    云端重打光常把人物整体拉冷拉灰，而环境没跟着变，于是人和景像两套光。
    按通道求「环境低频 ÷ 人物低频」，再除掉这个比值的亮度分量（用 Rec.709 权重），
    只留下纯色度差按 amount 回拉。amount=0 时原样返回。
    """
    cv2, np = _imports()
    out = np.asarray(out, np.float32)
    amount = TINT["amount"] if amount is None else float(amount)
    if amount <= 0 or out.ndim != 3:
        return np.clip(out, 0, 255).astype("uint8")
    mask = np.asarray(mask, np.float32)
    solid = (mask > 0.5).astype("float32")
    if float(solid.sum()) < 64.0:
        return np.clip(out, 0, 255).astype("uint8")
    sigma = max(1.0, min(out.shape[:2]) * TINT["sigma_frac"])
    fg = solid[..., None]
    den_fg = np.maximum(_blur(cv2, solid, sigma), 1e-3)[..., None]
    den_bg = np.maximum(_blur(cv2, 1.0 - solid, sigma), 1e-3)[..., None]
    person = _blur(cv2, out * fg, sigma) / den_fg
    env = _blur(cv2, out * (1 - fg), sigma) / den_bg
    ratio = env / np.maximum(person, 1.0)
    luma = np.array([0.2126, 0.7152, 0.0722], np.float32)
    neutral = ((env * luma).sum(axis=2, keepdims=True)
               / np.maximum((person * luma).sum(axis=2, keepdims=True), 1e-3))
    chroma = 1.0 + (ratio / np.maximum(neutral, 1e-3) - 1.0) * amount
    feather = _blur(cv2, np.clip(mask, 0, 1), 2.0)[..., None]
    gain = 1.0 + (chroma - 1.0) * feather
    return np.clip(out * gain, 0, 255).astype("uint8")


def encode_png(array):
    image = Image.fromarray(array)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()

def rehearsal_relit(img):
    """演练模式：本地提亮增饱和，模拟一次云端重打光（不调外部接口、不计费）。"""
    from PIL import ImageEnhance
    out = ImageEnhance.Brightness(img.convert("RGB")).enhance(1.35)
    return ImageEnhance.Color(out).enhance(1.25)


def rehearsal_mark(arr):
    """在成品左上角画演练角标，防止演练图被当成真实效果外发。"""
    cv2, np = _imports()
    out = np.asarray(arr, np.float32).copy()
    height, width = out.shape[:2]
    bar_w = max(72, width // 5)
    bar_h = max(16, height // 20)
    cv2.rectangle(out, (4, 4), (4 + bar_w, 4 + bar_h), (160, 40, 200), -1)
    cv2.putText(out, "REHEARSAL", (10, 4 + bar_h - 5), cv2.FONT_HERSHEY_SIMPLEX,
                max(0.35, bar_h / 30.0), (255, 255, 255), 1, cv2.LINE_AA)
    return np.clip(out, 0, 255).astype("uint8")
