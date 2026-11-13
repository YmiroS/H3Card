"""权重定位：按 ComfyUI 官方目录约定找 ultralytics / sam2 / rtmlib 权重，并缓存已加载的模型。

为什么走 folder_paths：预检（服务端 distributed.has_required_models）是拿模型文件名去比对节点
/object_info 里的下拉选项，权重不落进可枚举目录就会「判得过、跑的时候炸」。
为什么留 CHOUKA_SEG_MODELS 环境变量兜底：老部署把那三个 .pt 直接放在一个目录里，
升级期内两种摆法都要认，不能因为换了目录就把已在用的机器打停。
"""
import os

import folder_paths

ULTRALYTICS_CATEGORY = "ultralytics"
SAM_CATEGORY = "sam2"
POSE_CATEGORY = "rtmlib"

PERSON_MODEL_DEFAULT = "person_yolov8m-seg.pt"
FACE_MODEL_DEFAULT = "face_yolov8m.pt"
SAM_MODEL_DEFAULT = "sam2.1_hiera_small.pt"
SAM_CONFIG_DEFAULT = "configs/sam2.1/sam2.1_hiera_s.yaml"
# 姿势档：检测框 + 全身点位；文件名是实测下载下来的那份（models/rtmlib/ 下平铺）。
DET_MODEL_DEFAULT = "yolox_m_8xb8-300e_humanart.onnx"
RTMW_MODEL_DEFAULT = "rtmw-dw-x-l_simcc-cocktail14_384x288.onnx"
RTMW3D_MODEL_DEFAULT = "rtmw3d-x_8xb64_cocktail14-384x288.onnx"

_CACHE = {}


def _fallback_root(category):
    """ComfyUI 没登记这个模型类别时，按官方目录约定直接指到 <ComfyUI根>/models/<category>。

    注意别套两层 dirname：folder_paths.py 就躺在 ComfyUI 根目录，再退一层会指到
    ComfyUI 的上一级、模型列表变空、下拉只剩默认名，跑的时候才炸「权重缺失」。
    """
    root = getattr(folder_paths, "base_path", None)
    if not root:
        root = os.path.dirname(os.path.abspath(folder_paths.__file__))
    return os.path.join(root, "models", category)


def _roots(category):
    try:
        roots = list(folder_paths.get_folder_paths(category))
    except KeyError:
        roots = [_fallback_root(category)]
    extra = os.environ.get("CHOUKA_SEG_MODELS") or os.environ.get("CHOUKA_MODELS")
    if extra:
        roots.append(extra)
    return [root for root in roots if root]


def list_files(category, subfolder="", suffixes=(".pt", ".onnx", ".yaml", ".zip")):
    names = []
    for root in _roots(category):
        base = os.path.join(root, subfolder) if subfolder else root
        if not os.path.isdir(base):
            continue
        for name in sorted(os.listdir(base)):
            path = os.path.join(base, name)
            if os.path.isfile(path) and name.lower().endswith(suffixes):
                names.append(name)
    return sorted(set(names))


def resolve(category, filename, subfolder=""):
    if not filename:
        return None
    if os.path.isabs(filename) and os.path.isfile(filename):
        return filename
    for root in _roots(category):
        path = os.path.join(root, subfolder, filename) if subfolder else os.path.join(root,
                                                                                       filename)
        if os.path.isfile(path):
            return path
    return None


def combo(category, default, subfolder="", suffixes=(".pt", ".onnx", ".yaml", ".zip")):
    """下拉选项：目录里有什么就列什么，缺文件时也要把默认名留着，否则前端拿不到当前值。"""
    names = list_files(category, subfolder, suffixes)
    if default not in names:
        names = sorted(names + [default])
    return names


def person_model(name):
    if name not in _CACHE:
        from ultralytics import YOLO
        path = resolve(ULTRALYTICS_CATEGORY, name, "segm") or resolve(ULTRALYTICS_CATEGORY, name)
        if path is None:
            raise FileNotFoundError(
                f"人物分割权重缺失：请把 {name} 放到 models/{ULTRALYTICS_CATEGORY}/segm/")
        _CACHE[name] = YOLO(path)
    return _CACHE[name]


def face_model(name):
    if name not in _CACHE:
        from ultralytics import YOLO
        path = resolve(ULTRALYTICS_CATEGORY, name, "bbox") or resolve(ULTRALYTICS_CATEGORY, name)
        if path is None:
            return None
        _CACHE[name] = YOLO(path)
    return _CACHE[name]


def sam_configs():
    """sam2 包自带的结构文件名（形如 configs/sam2.1/sam2.1_hiera_s.yaml）。

    实测：pip 装好 sam2 之后结构 yaml 就在包里，build_sam2 按包内相对名去找，
    不需要再往 models/sam2 放一份 —— 之前预置清单里「yaml 必须与 .pt 同目录」那条不成立。
    """
    try:
        import sam2

        root = os.path.join(os.path.dirname(sam2.__file__), "configs", "sam2.1")
        names = sorted(name for name in os.listdir(root) if name.endswith(".yaml"))
        return [f"configs/sam2.1/{name}" for name in names] or [SAM_CONFIG_DEFAULT]
    except Exception:
        return [SAM_CONFIG_DEFAULT]


def sam_predictor(model_name, config_name):
    """SAM2 predictor 单例；权重或依赖缺失返回 None（补漏段自动跳过，出图主路不受影响）。"""
    key = f"sam:{model_name}:{config_name}"
    if key not in _CACHE:
        predictor = None
        path = resolve(SAM_CATEGORY, model_name)
        if path:
            try:
                from sam2.build_sam import build_sam2
                from sam2.sam2_image_predictor import SAM2ImagePredictor

                config = config_name if config_name in sam_configs() else SAM_CONFIG_DEFAULT
                predictor = SAM2ImagePredictor(build_sam2(config, path, device="cpu"))
            except Exception as error:  # 缺依赖/缺配置都算「这条支路不可用」
                predictor = None
                _CACHE[key + ":error"] = str(error)
        _CACHE[key] = predictor
    return _CACHE[key]


def sam_error(model_name, config_name):
    return _CACHE.get(f"sam:{model_name}:{config_name}:error")


def pose_model(cls, mode, det_name, pose_name):
    """RTMW 姿势模型：必须显式传本地权重路径（rtmlib 0.0.14 不认 RTMLIB_HOME，缺文件会当场联网下载）。"""
    key = f"{cls.__name__}:{mode}:{det_name}:{pose_name}"
    if key not in _CACHE:
        det = resolve(POSE_CATEGORY, det_name)
        pose = resolve(POSE_CATEGORY, pose_name)
        missing = [name for name, path in ((det_name, det), (pose_name, pose)) if path is None]
        if missing:
            raise FileNotFoundError(
                f"姿势权重缺失：请把 {'、'.join(missing)} 放到 models/{POSE_CATEGORY}/")
        _CACHE[key] = cls(mode=mode, det=det, pose=pose, backend="onnxruntime",
                          device="cpu", to_openpose=False)
    return _CACHE[key]
