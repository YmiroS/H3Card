# -*- coding: utf-8 -*-
"""
抽卡系统 — 工作流自动扫描器

作用：读 ComfyUI 界面格式工作流 json ->
  1) 转成 API 格式（可直接 POST /prompt 的模板）  -> graphs/<id>.api.json
  2) 自动推导画布卡片的输入槽（图/音频/提示词/时长/尺寸/种子）-> manifests/<id>.json
  3) 按"输入签名"把工作流自动归并成同一张卡的不同模式 -> manifests/_groups.json

用法：
  python_embeded\\python.exe chouka\\server\\scan_workflows.py            # 扫默认清单
  python_embeded\\python.exe chouka\\server\\scan_workflows.py <文件或目录> ...
"""
import json
import hashlib
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # chouka/
COMFY = ROOT.parent / "ComfyUI"
WF_DIR = COMFY / "user" / "default" / "workflows"
OBJECT_INFO = ROOT / "data" / "object_info.json"
ZH_CACHE = ROOT / "data" / "zh_nodes.json"
ZH_PACK = COMFY / "custom_nodes" / "ComfyUI-Chinese-Translation" / "zh-CN" / "Nodes"
COMFY_URL = "http://127.0.0.1:8188"
MISSING = object()          # 「widgets_values 里根本没这一项」，区别于「值是 None」

# P0 默认扫描清单：相对 WF_DIR 的路径 -> 固定 id
ALIASES = {
    "3-Flux2-klein全系列/九宫格Qwen3.5-Flux2-Kelin一键故事分镜.json": "flux2_klein_storyboard9",
    "4-Z-Image全系列/z-Image-标准版文生图.json": "zimage_t2i",
    "1-minimax H3/@MinimaxH3：图生视频 (4步加速版).json": "minimax_h3_i2v",
    "1-minimax H3/@MinimaxH3：首尾帧生视频（4步加速版）.json": "minimax_h3_flf2v",
    "1-minimax H3/@MiniMax H3_ 说话唱歌 单人（4步加速版）.json": "minimax_h3_talk1",
    "1-minimax H3/@MiniMax H3_ 说话唱歌 双人（4步加速版）.json": "minimax_h3_talk2",
    "1-minimax H3/MiniMax H3  四图全能参考单采.json": "minimax_h3_ref4",
    "1-minimax H3/@minimax-批量化漫剧20宫格-直出1分钟视频V3.json": "minimax_h3_comic20",
}

# 画布上的模式名（人工微调）。没写的能力走 short_name() 自动清洗文件名。
# 要求：一眼看出这个工作流干什么，不带 @ 前缀、不带"4步加速版"这类实现细节。
DISPLAY = {
    "zimage_t2i": "Z-Image 文生图",
    "flux2_klein_storyboard9": "九宫格故事分镜",
    "minimax_h3_i2v": "H3 图生视频",
    "minimax_h3_flf2v": "H3 首尾帧生视频",
    "minimax_h3_talk1": "H3 说话唱歌·单人",
    "minimax_h3_talk2": "H3 说话唱歌·双人",
    "minimax_h3_ref4": "H3 四图参考生视频",
    "minimax_h3_comic20": "漫剧4宫格",
}

# 画布上单独占一张卡的能力。素材形态有硬要求的（有 note，比如漫剧要宫格拼图）
# 会自动单独成卡；这里补的是玩法差别大、不该藏在别人模式列表里第 N 项的。
SOLO = {"minimax_h3_ref4"}

# 要把工作流里「关着的备用素材槽」开出来的能力（见 revive_bypassed）。
# 四图参考的第 4 个图槽在模板里是绕过状态，名字叫四图、实际只有三格。
REVIVE = {"minimax_h3_ref4"}

# 高级旋钮：这几个 widget 名不管挂在哪个节点上语义都一样，值得开出来给人调。
# 范围只能自己给 —— object_info 的范围是给专业用户的（步数上限 10000、LoRA 强度
# -100~100），照抄出来的滑条根本没法用。
# key -> (界面名, 最小, 最大, 步进, 说明)
# 说明里的 {d} 会替换成这条工作流里的真实默认值 —— 推荐值不能写死在文案里，
# 同一个 steps 在不同工作流是 4 / 8 / 9，写死就会跟面板上的数字对不上。
KNOBS = {
    "steps": ("采样步数", 1, 40, 1,
              "推荐 {d}：模型带加速 LoRA，{d} 步就到位了。往下调会花，往上调基本白等"),
    "strength_model": ("加速模型强度", 0, 2, 0.05,
                       "推荐 {d}（全开）：省时间全靠它。往下调画质略好但慢很多，0 = 不加速、慢好几倍"),
    "processing_control_value": ("提速档位", 0, 0.5, 0.005,
                                 "推荐 {d}：再快画面就开始糊、动作发飘，这一档是不掉画质的上限。0 = 不提速"),
}

# 文件名里的噪音：实现细节、版本号、厂商前缀
NOISE_PAREN = re.compile(r"[（(][^）)]*(?:步|加速|版|V\d)[^）)]*[）)]")
VENDOR = re.compile(r"mini\s*max\s*[-_ ]?h3|minimaxh3|minimax", re.I)


def short_name(stem):
    """把工作流文件名清洗成人能读的模式名（没有 DISPLAY 覆盖时用）"""
    s = stem.lstrip("@").strip()
    s = NOISE_PAREN.sub("", s)
    s = VENDOR.sub("H3", s)
    s = re.sub(r"[_：:\-]+", " ", s)
    return re.sub(r"\s+", " ", s).strip() or stem

# ---------- 分类表：只用于"要不要暴露给用户"，不参与取值 ----------
SKIP_TYPES = {
    "MarkdownNote", "Note", "LG_Note", "Label (rgthree)",
}
# 前端虚拟节点：不进 API 图，只做连线转发
VIRTUAL_TYPES = {
    "SetNode", "GetNode", "easy setNode", "easy getNode",
    "Reroute", "Reroute (rgthree)", "PrimitiveNode",
}
# 图片槽标签：按下游消费者的输入名推断（SPECIFIC 优先，GENERIC 兜底）
SLOT_SPECIFIC = {
    "first_frame": "首帧", "last_frame": "尾帧",
    "start_image": "首帧", "end_image": "尾帧",
    "ref_images": "参考图", "ref_image": "参考图",
    "reference_image": "参考图", "control_image": "控制图",
}
SLOT_GENERIC = {"image": "图片", "images": "图片", "pixels": "图片"}
HIDDEN_TYPES = {  # 后台节点，永不暴露
    "UNETLoader", "CLIPLoader", "VAELoader", "CheckpointLoaderSimple",
    "LoraLoaderModelOnly", "LoraLoader", "KSampler", "KSamplerSelect",
    "BasicScheduler", "BasicGuider", "SamplerCustomAdvanced", "RandomNoise",
    "VAEDecode", "VAEEncode", "VAEDecodeAudio", "ConditioningZeroOut",
    "ModelSamplingAuraFlow", "ModelSamplingAV", "TESpeedMiniMaxH3",
    "PathchSageAttentionKJ", "ComfyMathExpression", "CreateVideo",
}
TEXT_TYPES = {
    "PrimitiveStringMultiline": "value",
    "PrimitiveString": "value",
    "easy positive": "positive",
    "easy negative": "negative",
    "CLIPTextEncode": "text",
    "String Literal": "string",
}
SAVE_TYPES = {
    "SaveImage": "image", "PreviewImage": "image", "SaveAnimatedWEBP": "image",
    "SaveVideo": "video", "VHS_VideoCombine": "video", "SaveWEBM": "video",
    "SaveAudio": "audio", "SaveAudioMP3": "audio",
}
DURATION_HINTS = ("duration", "时长", "秒")

# 分辨率旋钮。视频工作流几乎没有裸的 width/height：尺寸由「尺寸提供者」节点算出来
#   ResolutionSelector          -> aspect_ratio + megapixels  -> width/height
#   ImageScaleByAspectRatio V2  -> scale_to_length（长边像素）
# 这几个输入名在任何插件里语义都一致，所以按名字识别，不认节点类名。
# (标签, 控件, (min, max, step))
# 上限来自 MiniMax H3 自己的画布常数（comfy_extras/nodes_minimax_h3.py:26-28）：
#   BASE_SHORT_EDGE = 768        原生短边
#   MAX_PIXELS = 768 * 1344      面积上限
#   CANVAS_MULTIPLE = 32         宽高必须是 32 的倍数
# 换算到 ResolutionSelector 的 megapixels：16:9 下 1.0MP = 1376×768，正好顶到原生
# 短边；再往上是训练分布外，只会更慢更糊，所以封在 1.1 而不是插件作者给的 16。
RES_FIELDS = {
    "aspect_ratio":    ("画面比例", "select", None),
    "megapixels":      ("分辨率", "slider", (0.2, 1.1, 0.01)),
    "scale_to_length": ("分辨率(长边)", "number", (512, 1344, 32)),
}


def is_size_provider(oi, ct):
    """节点的输出就是一对 width/height（如 ResolutionSelector），而不是图片。

    图片缩放节点（ImageResizeKJv2 / ImageScaleByAspectRatio）也顺带输出
    width/height，但它们的 aspect_ratio 是"怎么裁这张图"，语义不同，
    暴露出去会让用户以为在选出片比例，结果只是给原图加黑边。
    """
    names = [str(x).lower() for x in (oi.get(ct, {}).get("output_name") or [])]
    return "width" in names and "height" in names and "image" not in names


# 「编号列表」槽位：image_1 / prompt_3 / any_2 …
# 一堆同名带序号的输入，语义上是"往这个列表里塞第 k 项"。
ORD_SLOT = re.compile(r"^(.+?)_(\d+)$")


def ord_slot(api, nid):
    """nid 的输出接进了某个编号列表的第几号槽 -> (收集器id, 输入名, 序号)。

    不是编号槽（普通的 .image / .audio）就返回 (None, None, None)。
    """
    cid, cin = direct_consumer(api, nid)
    m = ORD_SLOT.match(cin or "")
    return (cid, cin, int(m.group(2))) if m else (None, None, None)


def ord_group(api, nids):
    """把一批节点按「接到同一个编号列表」归类 -> {收集器id: {序号: (在 nids 里的下标, 输入名)}}"""
    g = {}
    for i, nid in enumerate(nids):
        cid, cin, k = ord_slot(api, nid)
        if cid is not None:
            g.setdefault(cid, {})[k] = (i, cin)
    return g


def is_optional(oi, ct, name):
    opt = oi.get(ct, {}).get("input", {}).get("optional") or {}
    if name in opt:
        return True
    # 动态字典输入：节点定义里只声明父项（ref_images），实际连线是
    # ref_images.ref_image_3 这种带点的子项。父项选填 = 每个子项都能不接
    base = name.split(".")[0]
    return base != name and base in opt


# =====================================================================
# object_info
# =====================================================================
def load_object_info():
    if OBJECT_INFO.exists():
        return json.loads(OBJECT_INFO.read_text(encoding="utf-8"))
    OBJECT_INFO.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(COMFY_URL + "/object_info", timeout=120) as r:
        data = r.read()
    OBJECT_INFO.write_bytes(data)
    return json.loads(data.decode("utf-8"))


def load_zh():
    """
    汉化包给出每个节点的「中文默认标题」和 widget 中文名。
    用途：导出的 API json 里 _meta.title 是本地化默认名（如"加载图像"），
    必须能和用户自己写的标题（"场景""角色"）区分开，否则标签全错。
    """
    if ZH_CACHE.exists():
        return json.loads(ZH_CACHE.read_text(encoding="utf-8"))
    zh = {}
    if ZH_PACK.is_dir():
        for f in ZH_PACK.glob("*.json"):
            try:
                for ct, d in json.loads(f.read_text(encoding="utf-8")).items():
                    if not isinstance(d, dict):
                        continue
                    e = zh.setdefault(ct, {"titles": [], "widgets": {}})
                    if d.get("title"):
                        e["titles"].append(d["title"])
                    if isinstance(d.get("widgets"), dict):
                        e["widgets"].update({k: v for k, v in d["widgets"].items()
                                             if isinstance(v, str)})
            except Exception:
                continue
    ZH_CACHE.parent.mkdir(parents=True, exist_ok=True)
    ZH_CACHE.write_text(json.dumps(zh, ensure_ascii=False), encoding="utf-8")
    return zh


ZH = {}


def spec_of(oi, class_type, input_name):
    """取某个输入的 object_info 定义 (type, options)"""
    node = oi.get(class_type)
    if not node:
        return None, {}
    for group in ("required", "optional"):
        g = node.get("input", {}).get(group, {})
        if input_name in g:
            s = g[input_name]
            t = s[0] if s else None
            o = s[1] if len(s) > 1 and isinstance(s[1], dict) else {}
            return t, o
    return None, {}


# =====================================================================
# 界面格式 -> API 格式
# =====================================================================
def build_resolver(wf, oi, warns):
    """
    把一条连线的源头解析成"真实计算节点"：
      GetNode  -> 同名 SetNode 的上游
      Reroute  -> 上游
      绕过(mode 4) -> 同类型输入直通
      静音(mode 2) -> None（连线作废）
    """
    nodes = {n["id"]: n for n in wf.get("nodes", [])}
    links = {l[0]: (l[1], l[2]) for l in wf.get("links", [])
             if isinstance(l, list) and len(l) >= 5}
    setmap = {}
    for n in wf.get("nodes", []):
        if n.get("type") in ("SetNode", "easy setNode"):
            wv = n.get("widgets_values") or [None]
            if wv and wv[0]:
                setmap[str(wv[0])] = n

    def follow_input(node, slot_type=None, depth=0):
        """取 node 的（同类型优先的）第一个有效上游"""
        cands = [i for i in node.get("inputs", []) if i.get("link") is not None
                 and "widget" not in i]
        if slot_type:
            typed = [i for i in cands if i.get("type") == slot_type]
            cands = typed or cands
        if not cands:
            return None
        return resolve(*links.get(cands[0]["link"], (None, 0)), depth + 1)

    def resolve(nid, slot, depth=0):
        if nid is None or depth > 24:
            return None
        n = nodes.get(nid)
        if n is None:
            return None
        ct, mode = n.get("type"), n.get("mode", 0)
        if mode == 2:
            return None
        if ct in ("GetNode", "easy getNode"):
            wv = n.get("widgets_values") or [None]
            src = setmap.get(str(wv[0])) if wv else None
            if src is None:
                warns.append(f"Get_{wv[0] if wv else '?'} 找不到对应的 Set 节点")
                return None
            if src.get("mode", 0) != 0:
                return None
            return follow_input(src, depth=depth)
        if ct in VIRTUAL_TYPES:
            return follow_input(n, depth=depth)
        if mode == 4:                                    # 绕过 -> 直通
            outs = n.get("outputs") or []
            st = outs[slot].get("type") if slot < len(outs) else None
            return follow_input(n, st, depth)
        return (nid, slot)

    return nodes, links, resolve


def revive_bypassed(wf, warns):
    """把「关着的备用素材槽」开回来（只对 REVIVE 点名的工作流做）。

    素材节点被设成绕过（mode 4）时，它没有同类型输入可以直通，那根线其实就是断的。
    四图参考只剩三个图槽就是这么来的：第 4 张图的 LoadImage → SetNode → GetNode
    整条链都是绕过状态，开回来才对得上"四图"这个名字。

    为什么要点名、不能一律开：说话唱歌·双人 里也留着两个关着的备用参考图槽，
    开出来会把它变成 4 图，跟「按图片张数路由到单人/双人」直接打架（传 2 张会被
    判去跑单人，白扔一张图）。备用槽要不要露给用户是产品判断，从图里推不出来。
    """
    n = 0
    for node in wf.get("nodes", []):
        if node.get("mode") != 4:
            continue
        if node.get("type") in ("LoadImage", "LoadAudio") and not any(
                i.get("link") is not None for i in node.get("inputs", [])):
            node["mode"] = 0
            n += 1
        elif node.get("type") in VIRTUAL_TYPES or node.get("type") in (
                "SetNode", "GetNode", "easy setNode", "easy getNode"):
            node["mode"] = 0          # 中转节点本身没语义，跟着素材一起开
    if n:
        warns.append(f"已启用 {n} 个原本关着的备用素材槽")


def ui_to_api(wf, oi, warns, revive=False):
    """
    关键点：新版界面格式里 node["inputs"] 已经把 widget 也列进去了（带 "widget" 键），
    顺序与 widgets_values 一一对应；唯一的偏移来自 control_after_generate 多出的一个值。
    所以不需要猜 widget 下标。
    """
    if revive:
        revive_bypassed(wf, warns)
    nodes, links, resolve = build_resolver(wf, oi, warns)

    api = {}
    for n in wf.get("nodes", []):
        ct = n.get("type")
        if ct in SKIP_TYPES or ct in VIRTUAL_TYPES:
            continue
        if n.get("mode", 0) in (2, 4):     # 静音 / 绕过：不进图，由 resolve 直通
            continue
        if ct not in oi:
            if not (n.get("outputs") or n.get("inputs")):
                continue                   # 无端口的装饰节点，静默跳过
            warns.append(f"未知节点类型 {ct}（id={n['id']}），可能缺插件")
            continue

        # widgets_values 有两种存法。列表：按 node["inputs"] 里 widget 的顺序对位。
        # 字典：按名字存（VHS_VideoCombine 就是），而且字典顺序和 inputs 顺序不一样
        # ——拍平成列表再对位会整段错位，crf 会拿到 False，ffmpeg 直接报
        # 'Unable to parse option value "False"'，视频存不出来。所以字典必须按名字取。
        wv = n.get("widgets_values")
        wvd = wv if isinstance(wv, dict) else None
        wv = [] if wvd is not None else (wv or [])

        inputs = {}
        wi = 0
        for inp in n.get("inputs", []):
            name = inp.get("name")
            is_widget = "widget" in inp
            link = inp.get("link")
            if is_widget:
                _t, opts = spec_of(oi, ct, name)
                if wvd is not None:
                    val = wvd[name] if name in wvd else MISSING
                else:
                    val = wv[wi] if wi < len(wv) else None
                    wi += 1
                    if opts.get("control_after_generate"):
                        wi += 1            # 跳过 randomize/fixed
                if name in ("audioUI",) or inp.get("type") in ("AUDIO_UI",):
                    continue               # 纯 UI 组件
                if inp.get("type") in ("IMAGEUPLOAD", "AUDIOUPLOAD"):
                    continue               # 上传按钮
                if link is not None:
                    src = resolve(*links.get(link, (None, 0)))
                    inputs[name] = [str(src[0]), src[1]] if src else (
                        None if val is MISSING else val)
                elif val is MISSING:
                    # 名字对不上就别硬塞，留空让 ComfyUI 用节点自己的默认值
                    warns.append(f"#{n['id']} {ct}.{name} 不在 widgets_values 里，用节点默认值")
                    continue
                else:
                    inputs[name] = val
            else:
                if link is None:
                    continue
                src = resolve(*links.get(link, (None, 0)))
                if src:
                    inputs[name] = [str(src[0]), src[1]]   # ComfyUI 要求节点 id 是字符串

        # V3 自增长输入（ref_images.ref_image_0 / values.a）必须保持点号平铺，
        # ComfyUI 的 build_nested_inputs 自己会按 dynamic_paths 折成嵌套结构；
        # 若在这里折成 {"ref_images": [[..]]}，校验期报 "Required input is missing"。
        api[str(n["id"])] = {
            "class_type": ct,
            "inputs": inputs,
            "_meta": {"title": n.get("title") or oi[ct].get("display_name") or ct},
        }

    # 清掉指向已删除节点的连线
    for nid, node in api.items():
        for k, v in list(node["inputs"].items()):
            if (isinstance(v, list) and len(v) == 2
                    and isinstance(v[0], str) and isinstance(v[1], int)):
                if v[0] not in api:
                    warns.append(f"节点 {nid}.{k} 的上游 {v[0]} 已被跳过，输入被移除")
                    node["inputs"].pop(k)
    return api


# =====================================================================
# 自动推导输入槽
# =====================================================================
def is_literal(v):
    return not (isinstance(v, list) and len(v) == 2 and isinstance(v[0], (int, str))
                and not isinstance(v[0], bool) and isinstance(v[1], int))


def default_title(oi, ct, title):
    """标题是否只是节点自己的名字（英文或汉化默认名）"""
    if not title:
        return True
    t = title.strip()
    if t == ct or t == oi.get(ct, {}).get("display_name"):
        return True
    return t in ZH.get(ct, {}).get("titles", [])


def zh_widget(ct, name):
    return ZH.get(ct, {}).get("widgets", {}).get(name) or name


def consumers(api, nid):
    """谁消费了 nid 的输出 -> [(消费节点id, 输入名), ...]"""
    out = []
    for cid, node in api.items():
        for k, v in node["inputs"].items():
            if isinstance(v, list) and len(v) == 2 and str(v[0]) == str(nid):
                out.append((cid, k))
    return out


def direct_consumer(api, nid):
    cs = consumers(api, nid)
    return cs[0] if cs else (None, None)


def upstream(api, nid, seen=None):
    """nid 顺着连线往上游能追到的全部节点 id（跨多层）"""
    seen = set() if seen is None else seen
    for v in api.get(str(nid), {}).get("inputs", {}).values():
        if isinstance(v, list) and len(v) == 2 and str(v[0]) in api and str(v[0]) not in seen:
            seen.add(str(v[0]))
            upstream(api, v[0], seen)
    return seen


ZH_GRID = {4: "四宫格", 6: "六宫格", 9: "九宫格", 12: "十二宫格", 16: "十六宫格"}
GRID_COLS = ("水平", "横向", "column", "cols", "horizontal", "x_count")
GRID_ROWS = ("垂直", "纵向", "row", "rows", "vertical", "y_count")


def grid_of(api, nid, depth=0, seen=None):
    """这张上传图下游有没有「切格子」节点 -> (列数, 行数)。

    漫剧那条工作流要求每张图本身就是一张 2×2 的四宫格拼图，下游会把它切成 4 个
    分镜。不说清楚的话，用户传一张普通图进去只会被切成四块碎片，还不知道为什么。
    判据不认节点类名：同一个节点上同时有「横向数量」和「纵向数量」两个整数输入、
    乘积大于 1，那它就是在切格子。
    """
    seen = set() if seen is None else seen
    if str(nid) in seen or depth > 8:
        return None
    seen.add(str(nid))
    for cid, _k in consumers(api, nid):
        ins = api[cid]["inputs"]
        pick = lambda hints: next(                                   # noqa: E731
            (v for f, v in ins.items()
             if isinstance(v, int) and not isinstance(v, bool)
             and any(h in f.lower() for h in hints)), None)
        c, r = pick(GRID_COLS), pick(GRID_ROWS)
        if c and r and c * r > 1:
            return (c, r)
        g = grid_of(api, cid, depth + 1, seen)
        if g:
            return g
    return None


def traced_label(api, nid, depth=0, seen=None):
    """顺着数据流往下找语义明确的输入名；GENERIC 只做兜底"""
    seen = seen or set()
    if nid in seen or depth > 6:
        return None
    seen.add(nid)
    fallback = None
    for cid, k in consumers(api, nid):
        if k in SLOT_SPECIFIC:
            return SLOT_SPECIFIC[k]
        deep = traced_label(api, cid, depth + 1, seen)
        if deep:
            return deep
        fallback = fallback or SLOT_GENERIC.get(k)
    return fallback


def has_cjk(s):
    return bool(re.search(r"[\u4e00-\u9fff]", s or ""))


def pick_label(title, generic):
    """用户自己写的中文标题或短标签优先；英文长标题一律换成通用中文标签"""
    t = (title or "").strip()
    if t and (has_cjk(t) or len(t) <= 4):
        return t, None
    return generic, (t or None)


def derive_inputs(api, oi):
    images, audios, texts, params, seeds, outputs, crops, res = [], [], [], [], [], [], [], []
    for nid, node in sorted(api.items(), key=lambda kv: int(str(kv[0]).split(":")[0])):
        ct, ins = node["class_type"], node["inputs"]
        title = node["_meta"]["title"]

        if ct == "LoadImage":
            images.append((nid, title))
        elif ct == "LoadAudio":
            audios.append((nid, title))
        elif ct == "AudioCrop":
            crops.append((nid, title))
        elif ct in SAVE_TYPES:
            outputs.append((nid, SAVE_TYPES[ct], ins.get("filename_prefix")))
        else:
            # 通用规则：按输入的类型 + 名字 + object_info 选项判定角色，
            # 不依赖节点类名白名单，任何插件节点都能识别
            is_primitive = ct.startswith("Primitive") or ct in TEXT_TYPES
            for f, v in ins.items():
                if not is_literal(v):
                    continue
                t, opts = spec_of(oi, ct, f)
                low = f.lower()
                hint = f"{title or ''} {f}".lower()
                if low in ("seed", "noise_seed", "rand_seed"):
                    seeds.append((nid, f, v, t))
                elif low in KNOBS and t in ("INT", "FLOAT"):
                    # 这几个旋钮基本都长在采样器/LoRA/加速这类"后台节点"上，
                    # 所以要抢在 HIDDEN_TYPES 之前放行
                    params.append((nid, title, f, v, "knob", t))
                elif ct in HIDDEN_TYPES:
                    continue                              # 后台节点只取种子和白名单旋钮
                elif low in RES_FIELDS and (low == "scale_to_length"
                                            or is_size_provider(oi, ct)):
                    res.append((nid, f, low, v, t, opts))
                elif t == "STRING" and opts.get("multiline") and isinstance(v, str):
                    if any(x in low for x in ("system", "negative", "suffix", "prefix")):
                        continue
                    texts.append((nid, title, f, v))
                elif t == "STRING" and is_primitive and isinstance(v, str):
                    texts.append((nid, title, f, v))
                elif t in ("INT", "FLOAT"):
                    # 只有 Primitive 节点上的 duration 才是作者刻意暴露的时长旋钮；
                    # 别的节点（如 EmptyAudio.duration=0.01 的静音占位）同名但语义无关，
                    # 当成普通高级数值，否则时长滑条会写进错误的节点
                    if any(h in hint for h in DURATION_HINTS) and is_primitive:
                        params.append((nid, title, f, v, "duration", t))
                    elif low in ("width", "height"):
                        params.append((nid, low, f, v, "size", t))
                    elif is_primitive:
                        params.append((nid, title, f, v, "int", t))

    # 用户自己标了数字序号（1/2/3…）就按序号排，否则按节点 id
    if images and all(re.fullmatch(r"\d+", (t or "").strip() or "x") for _n, t in images):
        images.sort(key=lambda it: int(it[1].strip()))

    # ---- 图 ↔ 提示词配对 ----------------------------------------------
    # 漫剧那类工作流把图和提示词分别塞进两个编号列表（ImageBatchMultiple+.image_k
    # 和 easy promptList.prompt_k），再用同一个循环下标从两边取出来配对跑：
    # 也就是「第 k 张图配第 k 条提示词」。序号集合完全对齐才算配对成功，
    # 免得凑巧都带序号的两组无关输入被硬凑一起。
    img_g = ord_group(api, [n for n, _t in images])
    txt_g = ord_group(api, [n for n, _t, _f, _v in texts])
    pair, drop = {}, {}                # texts下标->images下标 / images下标->可断开的链接
    if len(img_g) == 1:
        ic, im = next(iter(img_g.items()))
        # 没上传的图要把链接整根断开，编号列表才会真的变短（否则模板里的演示图会
        # 顶上来照跑一轮）。只对声明为 optional 的编号槽这么干：required 槽断了
        # 会直接报结构错误。这跟"图配提示词"无关，任何编号图槽都要断。
        ct = api[ic]["class_type"]
        drop = {i: {"node": ic, "input": cin} for k, (i, cin) in im.items()
                if is_optional(oi, ct, cin)}
        if len(txt_g) == 1:
            _tc, tm = next(iter(txt_g.items()))
            if len(im) > 1 and set(im) == set(tm):
                pair = {tm[k][0]: im[k][0] for k in im}

    # ---- 哪些文本框是「作者调好的规范」而不是用户提示词 ------------------
    # 同一个 llama_cpp_instruct_adv 节点，在别的工作流里 custom_prompt 就是用户
    # 随手写的一句话；在漫剧里它是两千多字的剧本格式规范，真正的用户内容从另一根
    # 线（system_prompt）送进来。所以字段名和长度都不能当判据，只能看结构：
    # 这个文本框所在的节点，已经从上游收到了配对提示词 —— 那它就是"规则"不是"内容"。
    tpl = set()
    if pair:
        for i, (nid, _t, _f, _v) in enumerate(texts):
            up = upstream(api, nid) if i not in pair else set()
            if any(str(tc) in up for tc in txt_g):
                tpl.add(i)

    out = []
    used = {}
    res_seen = set()

    def res_item(key, nid, field, val, vt, opts):
        """分辨率旋钮。同一个 key 出现多次（首帧/尾帧各缩放一次）时，
        第 2 个起标 mirror：面板只画一个输入框，后端照样写进每个节点。"""
        label, kind, bound = RES_FIELDS[key]
        item = {"key": key, "label": label, "type": kind, "default": val,
                "target": {"node": nid, "input": field}}
        if kind == "select":
            item["options"] = list(opts.get("options") or [])
            if not item["options"]:
                return None
        else:
            item["target"]["vtype"] = vt if vt in ("INT", "FLOAT") else "INT"
            lo, hi, st = bound
            item.update(min=lo, max=hi, step=st)
        if key in res_seen:
            item["mirror"] = True
        res_seen.add(key)
        return item

    def uniq(label):
        used[label] = used.get(label, 0) + 1
        return label if used[label] == 1 else f"{label}{used[label]}"

    for i, (nid, title) in enumerate(images):
        gen = traced_label(api, nid) or "图片"
        label, hint = pick_label(None if default_title(oi, "LoadImage", title) else title, gen)
        item = {"key": f"images[{i}]", "label": uniq(label), "type": "image",
                "required": i == 0,
                "target": {"node": nid, "input": "image", "kind": "upload_image"}}
        if hint:
            item["hint"] = hint
        if i in drop and not item["required"]:
            item["dropIfEmpty"] = drop[i]      # 必填槽没得断，空着就直接报错了
        g = grid_of(api, nid)
        if g:
            item["grid"] = list(g)
        out.append(item)
    for i, (nid, title) in enumerate(audios):
        label, hint = pick_label(None if default_title(oi, "LoadAudio", title) else title, "音频")
        item = {"key": f"audio[{i}]", "label": uniq(label), "type": "audio",
                "required": i == 0,
                "target": {"node": nid, "input": "audio", "kind": "upload_audio"}}
        if hint:
            item["hint"] = hint
        out.append(item)
    for i, (nid, title, field, val) in enumerate(texts):
        ct = api[nid]["class_type"]
        label, hint = pick_label(None if default_title(oi, ct, title) else title,
                                "出片规范" if i in tpl else "提示词")
        item = {"key": "prompt" if i == 0 else f"prompt{i + 1}", "label": uniq(label),
                "type": "textarea", "default": val,
                "target": {"node": nid, "input": field}}
        if hint:
            item["hint"] = hint
        if i in tpl:
            # 面板会把它折起来，别让它长得像"第 6 条提示词"引人去改
            item["template"] = True
            item["note"] = ("预设的出片规范：分几个镜头、每镜多长、怎么硬切，都由它决定。"
                            "默认不用动，改了会直接影响成片结构。")
        if i in pair:
            # 面板把这些提示词收进一排 tab，第 k 个 tab 跟着第 k 张图亮/灭
            item["pairWith"] = f"images[{pair[i]}]"
        out.append(item)
    for nid, title, field, val, kind, vt in params:
        if kind == "duration":
            out.append({"key": "duration", "label": "时长(秒)", "type": "slider",
                        "min": 3, "max": 30, "step": 1, "default": val,
                        "target": {"node": nid, "input": field, "vtype": vt}})
        elif kind == "knob":
            key = field.lower()
            label, lo, hi, step, hint = KNOBS[key]
            item = {"key": key, "label": label, "type": "slider",
                    "min": lo, "max": max(hi, val), "step": step, "default": val,
                    "hint": hint.replace("{d}", f"{val:g}"), "advanced": True,
                    "target": {"node": nid, "input": field, "vtype": vt}}
            if any(x["key"] == key for x in out):
                item["mirror"] = True      # 同名旋钮出现多次：只画一个框，一起改
            out.append(item)
        elif kind == "size":
            out.append({"key": title, "label": {"width": "宽", "height": "高"}[title],
                        "type": "number", "default": val,
                        "target": {"node": nid, "input": field, "vtype": vt}})
        else:
            ct = api[nid]["class_type"]
            cid, cin = direct_consumer(api, nid)
            # Primitive 节点本身没有语义，看它喂给谁：喂给 scale_to_length
            # 就是这条工作流的分辨率旋钮（i2v/首尾帧生视频都是这么接的），
            # 不能当成匿名"高级数值"藏起来
            if cin in RES_FIELDS:
                _t, copts = spec_of(oi, api[cid]["class_type"], cin)
                item = res_item(cin, nid, field, val, vt, copts)
                if item:
                    out.append(item)
                    continue
            if default_title(oi, ct, title):
                title = zh_widget(api[cid]["class_type"], cin) if cin else "数值"
            out.append({"key": f"n{nid}", "label": title, "type": "number",
                        "default": val, "advanced": True,
                        "target": {"node": nid, "input": field, "vtype": vt}})
    for nid, field, key, val, t, opts in res:
        item = res_item(key, nid, field, val, t, opts)
        if item:
            out.append(item)
    for nid, title in crops:
        # 默认值必须读工作流里的真值。写死 0:05 的话，模板本来裁 10 秒的（说话唱歌·双人
        # 就是）会被面板悄悄改成 5 秒，音频被砍一半还看不出是谁干的
        for key, label, field in (("audio_start", "音频起点", "start_time"),
                                  ("audio_end", "音频终点", "end_time")):
            out.append({"key": key, "label": label, "type": "text",
                        "default": api[nid]["inputs"].get(field), "advanced": True,
                        "target": {"node": nid, "input": field}})
    for i, (nid, field, val, vt) in enumerate(seeds):
        item = {"key": "seed", "label": "种子", "type": "seed", "default": val,
                "target": {"node": nid, "input": field, "vtype": vt or "INT"}}
        if i:
            item["mirror"] = True          # 多个采样器共用同一个种子输入框
        out.append(item)

    # 切格子的工作流：这是用户唯一会踩的坑，写成卡片说明摆在最上面
    note = None
    grids = [tuple(s["grid"]) for s in out if s.get("grid")]
    if grids:
        c, r = grids[0]
        per, n = c * r, len(grids)
        note = (f"每张图都要是 {c}×{r} 的{ZH_GRID.get(per, str(per) + '宫格')}拼图，"
                f"上传后自动切成 {per} 个分镜、连成一段视频。"
                + (f"传满 {n} 张就是 {per * n} 宫格，按顺序接成一整条完整视频。"
                   if n > 1 else ""))
    return out, outputs, len(images), len(audios), note


def required_keys(oi, ct):
    """展开 V3 自增长输入后真正的必填 key 集合。

    ComfyUI 的 get_finalized_class_inputs 会把 COMFY_AUTOGROW_V3 展成点号平铺的
    子 key（values.a / ref_images.ref_image_0），前 min 个且模板内层是 required
    的才算必填。不展开就查不出 "Required input is missing"。
    """
    keys = []
    for k, spec in (oi[ct]["input"].get("required") or {}).items():
        if not (isinstance(spec, list) and spec and spec[0] == "COMFY_AUTOGROW_V3"):
            keys.append(k)
            continue
        tpl = spec[1]["template"]
        names = tpl.get("names") or [f"{tpl['prefix']}{i}" for i in range(tpl["max"])]
        inner_required = "required" in tpl.get("input", {})
        if inner_required:
            keys += [f"{k}.{n}" for n in names[:tpl.get("min", 0)]]
    return keys


def repair_loop_count(api, oi, warns):
    """把「循环次数」接到量表上——作者忘接的那根线。

    漫剧20宫格是这么长的：forLoopStart 的下标同时去 indexAnything 取第 k 张图和
    第 k 条提示词，所以循环该跑「图有几张」次。作者放了一个 lengthAnything 量了
    图的条数，却没把它接进 total，total 还是写死的 1 —— 结果传 5 张图也只出 1 条。

    判据全靠结构，不认节点类名：total 是死数字、下标喂给了某个 indexAnything、
    而同一个列表上挂着一个输出 INT 又没人用的量表节点。三条同时成立才改。
    """
    for lid, node in list(api.items()):
        total = node["inputs"].get("total")
        if not isinstance(total, int):
            continue
        # 这个循环的下标在索引哪些列表
        lists = {str(x["inputs"]["any"][0])
                 for x in api.values()
                 if isinstance(x["inputs"].get("index"), list)
                 and str(x["inputs"]["index"][0]) == str(lid)
                 and isinstance(x["inputs"].get("any"), list)}
        for cid in lists:
            for mid, m in api.items():
                if (oi.get(m["class_type"], {}).get("output") == ["INT"]
                        and isinstance(m["inputs"].get("any"), list)
                        and str(m["inputs"]["any"][0]) == cid
                        and not consumers(api, mid)):
                    node["inputs"]["total"] = [mid, 0]
                    warns.append(f"已修：#{lid}.total 写死 {total}，改接 "
                                 f"#{mid} {m['class_type']}（按 #{cid} 的条数循环）")
                    return


def validate_api(api, oi):
    """提交前的结构自检：必填项是否齐全、连线是否悬空"""
    errs = []
    for nid, n in api.items():
        ct = n.get("class_type")
        if ct not in oi:
            errs.append(f"#{nid} 未知节点 {ct}")
            continue
        ins = n.get("inputs", {})
        for k in required_keys(oi, ct):
            if k not in ins:
                errs.append(f"#{nid}({ct}) 缺必填输入 {k}")
        for k, v in ins.items():
            if isinstance(v, list) and len(v) == 2 and isinstance(v[1], int) \
                    and str(v[0]) not in api:
                errs.append(f"#{nid}({ct}).{k} 上游 {v[0]} 不存在")
    return errs


def fingerprint(m):
    """能力的「输入指纹」：图片槽不算，其余 key 排序。
    两条工作流指纹相同、只差图片张数 —— 那就是同一件事的不同张数版本。"""
    return (m["audios"], tuple(sorted(i["key"] for i in m["inputs"] if i["type"] != "image")))


def build_modes(ms):
    """把「只差图片张数」的能力合并成一个模式：传几张图，就跑哪条工作流。

    图生视频(1图) 和 首尾帧生视频(2图) 的输入除了多一个尾帧槽完全一样，对用户
    来说本来就是一件事 —— 传一张是图生视频，传两张是首尾帧。让人先选模式再想
    张数是多余的；更糟的是选了首尾帧却只传一张，模板自带的演示尾帧会顶上来照跑。
    合并后张数说话，模式列表也短了。
    """
    fam = {}
    for m in ms:
        fam.setdefault(fingerprint(m), []).append(m)
    ladders = {}                                  # 合并后的 top id -> 阶梯
    for group in fam.values():
        counts = {m["images"] for m in group}
        if len(group) < 2 or len(counts) != len(group) or min(counts) < 1:
            continue                              # 张数撞车或压根没有图槽：不合并
        group.sort(key=lambda m: m["images"])
        top = group[-1]
        # 多出来的图槽必须是选填的，否则合并后用户看到一个必填槽却不需要填
        extra = [i for i in top["inputs"]
                 if i["type"] == "image" and int(i["key"][7:-1]) >= group[0]["images"]]
        if any(i.get("required") for i in extra):
            continue
        ladders[top["id"]] = {
            "name": group[0]["name"].split("·")[0],   # "说话唱歌·单人" -> "说话唱歌"
            "ladder": {str(m["images"]): m["id"] for m in group},
            "members": {m["id"] for m in group},
        }
    merged = {i for L in ladders.values() for i in L["members"]} - set(ladders)
    modes = []
    for m in ms:
        if m["id"] in merged:
            continue                              # 已经并进同族的 top 里了
        md = {"id": m["id"], "name": m["name"], "slots": m["slots"]}
        if m["id"] in ladders:
            md["name"] = ladders[m["id"]]["name"]
            md["ladder"] = ladders[m["id"]]["ladder"]
        modes.append(md)
    return modes


def slugify(name):
    s = re.sub(r"[^A-Za-z0-9]+", "_", name).strip("_").lower()
    return s if len(re.sub(r"[^a-z0-9]", "", s)) >= 3 else ""


def scan(path: Path, oi, rel_key=None):
    wf = json.loads(path.read_text(encoding="utf-8"))
    warns = []
    subs = wf.get("definitions", {}).get("subgraphs", [])
    if subs:
        warns.append(f"含 {len(subs)} 个子图(subgraph)，本地转换无法展开 -> 必须用 ComfyUI「工作流→导出(API)」")

    wid = ALIASES.get(rel_key) or slugify(path.stem) or "wf_" + hashlib.md5(
        path.stem.encode("utf-8")).hexdigest()[:8]
    api_path = ROOT / "graphs" / f"{wid}.api.json"
    if subs and api_path.exists():
        warns = [f"子图工作流：使用已导出的 {api_path.name}（本地未重新转换）"]
        api = json.loads(api_path.read_text(encoding="utf-8"))
    else:
        api = ui_to_api(wf, oi, warns, revive=wid in REVIVE)
    repair_loop_count(api, oi, warns)
    inputs, outputs, n_img, n_aud, note = derive_inputs(api, oi)
    out_type = outputs[0][1] if outputs else "unknown"
    warns += [f"结构错误 {e}" for e in validate_api(api, oi)]
    if not outputs:
        warns.append("找不到输出节点（SaveImage/SaveVideo/…），无法取回产物")

    manifest = {
        "id": wid,
        "name": DISPLAY.get(wid) or short_name(path.stem),
        "file": path.stem,                      # 原始文件名，出问题时对得上
        "source": str(path),
        "group": {"video": "视频", "image": "图片", "audio": "音频"}.get(out_type, "其他"),
        "outputType": out_type,
        # 归并到哪张卡。素材形态有硬要求的（比如每张图得是宫格拼图）自动单独成卡，
        # 玩法跟普通生视频不是一回事，塞进同一张卡的模式列表里没人找得到。
        "card": wid if (note or wid in SOLO) else out_type,
        "slots": f"img{n_img}+aud{n_aud}",      # 槽位指纹
        "images": n_img,
        "audios": n_aud,
        "graph": f"graphs/{wid}.api.json",
        "output": {"node": outputs[0][0]} if outputs else None,
        "note": note,
        "inputs": inputs,
        "warnings": warns,
    }
    if not subs:
        api_path.write_text(json.dumps(api, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "manifests" / f"{wid}.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    global ZH
    oi = load_object_info()
    ZH = load_zh()
    args = sys.argv[1:]
    targets = []
    if args:
        for a in args:
            p = Path(a)
            if p.is_dir():
                targets += [(f, None) for f in sorted(p.rglob("*.json"))]
            elif p.exists():
                targets.append((p, None))
            else:
                print(f"!! 找不到 {a}")
    else:
        for rel in ALIASES:
            p = WF_DIR / rel
            if p.exists():
                targets.append((p, rel))
            else:
                print(f"!! 缺文件 {rel}")

    (ROOT / "graphs").mkdir(exist_ok=True)
    (ROOT / "manifests").mkdir(exist_ok=True)

    groups, manifests = {}, []
    for p, rel in targets:
        try:
            m = scan(p, oi, rel)
        except Exception as e:
            print(f"!! 扫描失败 {p.name}: {type(e).__name__}: {e}")
            continue
        manifests.append(m)
        groups.setdefault(m["card"], []).append(m)

        print(f"\n=== {m['id']}  [{m['group']}/{m['outputType']}]  {m['name']}")
        print(f"    槽位 {m['slots']}   输出节点 {m['output']}")
        for i in m["inputs"]:
            flag = "*" if i.get("required") else (" advanced" if i.get("advanced") else "")
            dv = i.get("default")
            dv = (str(dv)[:40] + "…") if isinstance(dv, str) and len(str(dv)) > 40 else dv
            print(f"    - {i['label']:<10} {i['type']:<9} {i['key']:<12} "
                  f"-> #{i['target']['node']}.{i['target']['input']}  默认={dv}{flag}")
        for w in m["warnings"]:
            print(f"    ⚠ {w}")

    CARD_META = {
        "image": ("card_image", "生图", "🖼"),
        "video": ("card_video", "生视频", "🎬"),
        "audio": ("card_audio", "生音频", "🎵"),
    }
    cards = []
    for key, ms in groups.items():
        ms.sort(key=lambda m: (m["images"], m["audios"]))
        # 没进 CARD_META 的 key 就是单独成卡的能力，卡名直接用它自己的名字；
        # 要宫格拼图的给个 ▦，其余跟着产出类型的图标走
        solo_icon = "▦" if ms[0].get("note") else CARD_META.get(ms[0]["outputType"],
                                                               (0, 0, "◻"))[2]
        cid, cname, icon = CARD_META.get(key, (key, ms[0]["name"], solo_icon))
        cards.append({
            "id": cid, "name": cname, "icon": icon, "outputType": ms[0]["outputType"],
            "modes": build_modes(ms),
        })
    (ROOT / "manifests" / "_cards.json").write_text(
        json.dumps(cards, ensure_ascii=False, indent=1), encoding="utf-8")
    print("\n=== 自动归并：画布上只有这几张卡，工作流退化为卡内「模式」")
    for c in cards:
        print(f"    {c['icon']} {c['name']}  ({len(c['modes'])} 模式)")
        for md in c["modes"]:
            print(f"        [{md['slots']:<10}] {md['id']:<26} {md['name']}")
            for n, wid in sorted(md.get("ladder", {}).items()):
                print(f"            {n} 张图 -> {wid}")
    print(f"\n共 {len(manifests)} 个能力 -> chouka/manifests/")


if __name__ == "__main__":
    main()
