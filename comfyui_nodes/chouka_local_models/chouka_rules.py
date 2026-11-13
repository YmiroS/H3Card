"""分割口径规则：与 server/local_relight.py 的逐人实例分割链保持同一套参数与判定。

节点跑在 ComfyUI 进程里（另一台机、另一套 Python），不能 import 服务端模块，
所以这里把规则复制一份。复制是刻意的：两遍逻辑必须逐条对得上，
否则同一张图在「本机识别」和「节点识别」下会得到不同的候选人编号。
对账脚本见 tests/test_chouka_local_model_nodes.py 与 docs 里的验收记录。
"""
import cv2
import numpy as np

# 生产定案参数（local_relight.py:119-120）
IMGSZ = 640
CONF = 0.3
MIN_PERSON_AREA_RATIO = 0.002


def to_bgr(rgb):
    return cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)


def fill_and_close(mask):
    """实例蒙版后处理：外轮廓补洞 + 3x3 闭运算（对应 _seg_postfix）。"""
    m = (mask > 0.5).astype("uint8")
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(m)
    if contours:
        # 颜色是 1、线宽才是 FILLED：这两个参数顺序写反只会描出一圈边，面积过不过最小线全看运气。
        cv2.drawContours(filled, contours, -1, 1, cv2.FILLED)
    return cv2.morphologyEx(filled, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))


def detect_persons(img, model, *, imgsz=IMGSZ, conf=CONF, min_area_ratio=MIN_PERSON_AREA_RATIO):
    """YOLO 人物实例分割 → 每人一张 uint8 蒙版（已过补洞闭运算与最小面积线）。

    面积线用 max(64, 图面积*比例)，与 segment_persons_yolo 一致；
    概率图先双线性放回原尺寸再阈值化，顺序换了边缘会差半像素。
    """
    height, width = img.shape[:2]
    result = model.predict(img, imgsz=imgsz, conf=conf, verbose=False)[0]
    floor = max(64, int(width * height * min_area_ratio))
    masks = []
    if result.masks is not None:
        for raw in result.masks.data.cpu().numpy():
            scaled = cv2.resize(raw, (width, height), interpolation=cv2.INTER_LINEAR)
            solid = fill_and_close(scaled)
            if int(solid.sum()) > floor:
                masks.append(solid)
    return masks


def detect_face_boxes(img, model, *, imgsz=IMGSZ, conf=CONF):
    """人脸检出 → xyxy 整数框列表（对应 _seg_recover_faces 里的检出段）。"""
    result = model.predict(img, imgsz=imgsz, conf=conf, verbose=False)[0]
    if result.boxes is None:
        return []
    return [[int(v) for v in box] for box in result.boxes.xyxy.cpu().numpy()]


def box_to_mask(box, shape):
    """xyxy 整数框 → uint8 实心矩形蒙版（节点之间只用标准 MASK 传框，不自定义数据类型）。"""
    height, width = shape
    mask = np.zeros((height, width), np.uint8)
    x0, y0, x1, y1 = box
    mask[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = 1
    return mask


def mask_to_box(mask):
    """uint8 蒙版 → xyxy 整数框；全空返回 None，调用方按「没有这一项」处理。"""
    ys, xs = np.nonzero(mask)
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


def recover_faces(img, person_masks, face_boxes, sam, *,
                  min_area_ratio=MIN_PERSON_AREA_RATIO):
    """人脸锚点补漏（逐行对应 _seg_recover_faces）：漏检的脸扩框交给 SAM2 补一块。

    只补漏不精修；跳过已盖住的脸、已检出人物包围盒内的脸、以及小人脸；
    补出的块要过与检出一致的最小面积线（这里 floor 用 200 起判，比检出段的 64 高）。
    """
    if sam is None:
        return []
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = img.shape[:2]
    union = np.zeros((height, width), np.uint8)
    boxes = []
    for mask in person_masks:
        union |= mask
        ys, xs = np.nonzero(mask)
        if len(xs):
            boxes.append((xs.min(), ys.min(), xs.max(), ys.max()))
    recovered = []
    face_marks = []
    floor = max(200, int(width * height * min_area_ratio))
    # 与 _seg_recover_faces 一致：进循环前先把这张图喂给 SAM2，一个循环里反复 predict。
    sam.set_image(rgb)
    for x0, y0, x1, y1 in face_boxes:
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
        predicted, _, _ = sam.predict(box=np.array([[bx0, by0, bx1, by1]]),
                                      multimask_output=False)
        solid = fill_and_close(predicted[0].astype("float32"))
        if int(solid.sum()) > floor:
            recovered.append(solid)
            face_marks.append((fcx, fcy, fw))
    kept = []
    kept_faces = []
    accepted = np.zeros((height, width), np.uint8)
    for solid, (fcx, fcy, fw) in sorted(zip(recovered, face_marks), key=lambda pair: -int(pair[0].sum())):
        total = int(solid.sum())
        if total and float(np.logical_and(accepted, solid).sum()) / total > 0.5:
            continue
        if any((fcx - kx) ** 2 + (fcy - ky) ** 2 < ((fw + kw) / 2) ** 2
               for kx, ky, kw in kept_faces):
            continue
        kept.append(solid)
        kept_faces.append((fcx, fcy, fw))
        accepted |= solid
    return kept


def sam_masks_for_prompts(sam, img, prompts, *, min_area_ratio=MIN_PERSON_AREA_RATIO):
    """按点/框提示出单块蒙版（P2：编辑器里的点选、框选补选）。

    prompts 为 [{points:[[x,y]...], labels:[1|0...], box:[x0,y0,x1,y1]|None}]，
    坐标是像素整数；面积不过线的按「没分出这块」返回空列表，不静默给一小团。
    """
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    height, width = img.shape[:2]
    floor = max(64, int(width * height * min_area_ratio))
    sam.set_image(rgb)
    masks = []
    for prompt in prompts:
        box = prompt.get("box")
        kwargs = {}
        points = prompt.get("points") or []
        if points:
            kwargs["point_coords"] = np.asarray(points, np.float32)
            kwargs["point_labels"] = np.asarray(prompt.get("labels") or [1] * len(points), np.int32)
        if box is not None:
            kwargs["box"] = np.asarray(box, np.int32)
        if not kwargs:
            continue
        predicted, _, _ = sam.predict(multimask_output=False, **kwargs)
        solid = fill_and_close(predicted[0].astype("float32"))
        if int(solid.sum()) > floor:
            masks.append(solid)
    return masks


def order_by_centroid_x(masks):
    """按质心横坐标排序（p1 最左）：识别与出图回放都按它编号，候选 id 才对得上。"""
    def center_x(mask):
        ys, xs = np.nonzero(mask)
        return float(xs.mean()) if len(xs) else 0.0

    return sorted(masks, key=center_x)


def build_index_layer(masks, shape):
    """有序蒙版 → 单通道身份索引层 uint8（0=背景，1..255 按传入顺序编号）。

    超过 255 个人的部分不写进层：索引层一位一号，溢出静默截断会让后面的编号错位，
    所以调用方要拿到 dropped 数量并说清楚。
    """
    height, width = shape
    layer = np.zeros((height, width), np.uint8)
    dropped = 0
    for index, mask in enumerate(masks, 1):
        if index > 255:
            dropped += 1
            continue
        layer[mask > 0.5] = index
    return layer, dropped


def index_layer_entries(layer):
    """索引层 → 逐身份条目（归一化 box / coverage / cx），口径与 local_relight 的 entries 一致。"""
    height, width = layer.shape
    entries = []
    for index in range(1, int(layer.max()) + 1):
        ys, xs = np.nonzero(layer == index)
        if not len(xs):
            continue
        entries.append({
            "index": int(index),
            "box": [float(xs.min()) / width, float(ys.min()) / height,
                    float(xs.max() + 1) / width, float(ys.max() + 1) / height],
            "coverage": float(len(xs)) / (width * height),
            "cx": float(xs.mean()) / width,
        })
    return entries
