"""分割类节点：逐人实例分割、人脸检出、SAM2 提示补漏/点框选、身份合并与无损落盘。

节点之间只用 ComfyUI 标准数据类型（IMAGE / MASK / INT / STRING）传值：
人脸框以「实心矩形 MASK」的形式传递，取回时用非零像素边界还原 xyxy，
这样任何下游节点和前端都能读懂，不需要自定义类型（老版 ComfyUI 上更稳）。
"""
import json
import threading

import numpy as np
import torch

from . import chouka_models as models
from . import chouka_rules as rules

# SAM2 predictor 的 set_image 与 predict 之间没有自己的锁：多 worker 并发时后一次 set_image
# 会盖掉前一次，出图拿到别人图的蒙版（服务端实测 6 次并发崩 2 次）。这里串行化。
_SAM_LOCK = threading.Lock()

_PALETTE = [(0.90, 0.20, 0.25), (0.20, 0.75, 0.35), (0.25, 0.45, 0.95),
            (0.95, 0.80, 0.20), (0.75, 0.35, 0.85), (0.25, 0.80, 0.80)]


def _image_to_bgr(image):
    """ComfyUI IMAGE（[B,H,W,C] float 0..1）→ BGR uint8，喂给 ultralytics/sam2 的那一份。"""
    array = (np.clip(image[0].cpu().numpy(), 0, 1) * 255.0).astype(np.uint8)
    return rules.to_bgr(array)


def _masks_to_tensor(masks):
    if not masks:
        return torch.zeros((0, 1, 1), dtype=torch.float32)
    return torch.from_numpy(np.stack(masks).astype(np.float32))


def _boxes_to_mask_tensor(boxes, shape):
    if not boxes:
        return torch.zeros((0, shape[0], shape[1]), dtype=torch.float32)
    return torch.from_numpy(np.stack([rules.box_to_mask(box, shape)
                                      for box in boxes]).astype(np.float32))


def _mask_tensor_to_boxes(masks):
    boxes = []
    for mask in masks:
        solid = (mask.cpu().numpy() > 0.5).astype(np.uint8)
        box = rules.mask_to_box(solid)
        if box is not None:
            boxes.append(box)
    return boxes


def _overlay(image, masks):
    """身份色半透明叠回原图：验收用的「谁被分出来了、分成了几块」一张图看清楚。"""
    base = np.clip(image[0].cpu().numpy(), 0, 1).copy()
    for index, mask in enumerate(masks):
        color = _PALETTE[index % len(_PALETTE)]
        solid = mask > 0.5
        base[solid] = base[solid] * 0.45 + np.array(color, np.float32) * 0.55
    return torch.from_numpy(base)[None, ...]


class ChoukaPersonSeg:
    """人物实例分割：一张图 → 每人一块蒙版（补洞 + 闭运算 + 最小面积线都在这一步做完）。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "model_name": (models.combo(models.ULTRALYTICS_CATEGORY,
                                            models.PERSON_MODEL_DEFAULT, "segm"),),
                "imgsz": ("INT", {"default": rules.IMGSZ, "min": 320, "max": 1536, "step": 64}),
                "conf": ("FLOAT", {"default": rules.CONF, "min": 0.05, "max": 0.90, "step": 0.05}),
                "min_area_ratio": ("FLOAT", {"default": rules.MIN_PERSON_AREA_RATIO,
                                              "min": 0.0005, "max": 0.05, "step": 0.0005}),
            }
        }

    RETURN_TYPES = ("MASK", "INT", "IMAGE", "STRING")
    RETURN_NAMES = ("masks", "count", "preview", "note")
    FUNCTION = "segment"
    CATEGORY = "chouka/分割"
    DESCRIPTION = "逐人实例分割（生产档 640/conf0.3），出每人一块蒙版与叠色预览。"

    def segment(self, image, model_name, imgsz, conf, min_area_ratio):
        img = _image_to_bgr(image)
        model = models.person_model(model_name)
        masks = rules.detect_persons(img, model, imgsz=imgsz, conf=conf,
                                     min_area_ratio=min_area_ratio)
        note = "" if masks else "没检出人物：画面里可能没有完整人形，或 conf/最小面积线调太紧"
        return (_masks_to_tensor(masks), len(masks), _overlay(image, masks), note)


class ChoukaFaceSeg:
    """人脸检出：只出框（以实心矩形 MASK 传递），给「人脸锚点补漏」当锚。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "model_name": (models.combo(models.ULTRALYTICS_CATEGORY,
                                            models.FACE_MODEL_DEFAULT, "bbox"),),
                "imgsz": ("INT", {"default": rules.IMGSZ, "min": 320, "max": 1536, "step": 64}),
                "conf": ("FLOAT", {"default": rules.CONF, "min": 0.05, "max": 0.90, "step": 0.05}),
            }
        }

    RETURN_TYPES = ("MASK", "INT", "STRING")
    RETURN_NAMES = ("face_boxes", "count", "boxes_json")
    FUNCTION = "detect"
    CATEGORY = "chouka/分割"
    DESCRIPTION = "人脸检测，出 xyxy 框（矩形蒙版 + JSON 两种形式）。"

    def detect(self, image, model_name, imgsz, conf):
        img = _image_to_bgr(image)
        model = models.face_model(model_name)
        if model is None:
            height, width = image.shape[1], image.shape[2]
            return (_boxes_to_mask_tensor([], (height, width)), 0,
                    json.dumps({"boxes": [], "note": f"人脸权重 {model_name} 不在位，补漏段跳过"}))
        boxes = rules.detect_face_boxes(img, model, imgsz=imgsz, conf=conf)
        height, width = image.shape[1], image.shape[2]
        return (_boxes_to_mask_tensor(boxes, (height, width)), len(boxes),
                json.dumps({"boxes": boxes}, ensure_ascii=False))


class ChoukaSamPrompt:
    """SAM2 提示分割：recover_faces 用人脸框补漏检的人，prompts 用点/框做编辑器补选。

    补漏必须带着已检出人物的蒙版做判断（盖住了、落在包围盒里的、小人脸都不补），
    所以这一段整体放在节点里，不让服务端再算一遍。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "mode": (["recover_faces", "prompts"],),
                "sam_model": (models.combo(models.SAM_CATEGORY, models.SAM_MODEL_DEFAULT),),
                "sam_config": (models.sam_configs(),),
                "prompt_json": ("STRING", {"default": "", "multiline": True}),
            },
            "optional": {
                "person_masks": ("MASK",),
                "face_boxes": ("MASK",),
            }
        }

    RETURN_TYPES = ("MASK", "INT", "STRING")
    RETURN_NAMES = ("masks", "count", "note")
    FUNCTION = "predict"
    CATEGORY = "chouka/分割"
    DESCRIPTION = "SAM2 补漏与点/框选；缺 SAM2 时返回空蒙版并在 note 里说明，不静默当成「没有这个人」。"

    def predict(self, image, mode, sam_model, sam_config, prompt_json,
                person_masks=None, face_boxes=None):
        height, width = image.shape[1], image.shape[2]
        empty = (_masks_to_tensor([]), 0, "")
        predictor = models.sam_predictor(sam_model, sam_config)
        if predictor is None:
            reason = models.sam_error(sam_model, sam_config) or "权重或依赖不在位"
            return (_masks_to_tensor([]), 0, f"SAM2 不可用（{reason}）：补漏/点框选这一段跳过")
        img = _image_to_bgr(image)
        if mode == "prompts":
            try:
                prompts = json.loads(prompt_json or "[]")
            except json.JSONDecodeError as error:
                raise ValueError(f"prompt_json 不是合法 JSON：{error}")
            if not isinstance(prompts, list) or not prompts:
                return (empty[0], 0, "prompt_json 为空：点框选需要至少一个 {points|box} 提示")
            prompts = [dict(prompt,
                            points=[[int(round(x * width)), int(round(y * height))]
                                    for x, y in (prompt.get("points") or [])],
                            box=([int(round(prompt["box"][0] * width)),
                                  int(round(prompt["box"][1] * height)),
                                  int(round(prompt["box"][2] * width)),
                                  int(round(prompt["box"][3] * height))]
                                 if prompt.get("box") else None))
                       for prompt in prompts if isinstance(prompt, dict)]
            with _SAM_LOCK:
                masks = rules.sam_masks_for_prompts(predictor, img, prompts)
            return (_masks_to_tensor(masks), len(masks),
                    "" if masks else "提示位置没分出一整块（面积不过线），请换个位置再点")
        detected = ([] if person_masks is None
                    else [(m.cpu().numpy() > 0.5).astype(np.uint8) for m in person_masks])
        boxes = [] if face_boxes is None else _mask_tensor_to_boxes(face_boxes)
        if not boxes:
            return (empty[0], 0, "没有人脸框：这张图不需要补漏")
        with _SAM_LOCK:
            recovered = rules.recover_faces(img, detected, boxes, predictor)
        return (_masks_to_tensor(recovered), len(recovered),
                "" if recovered else "检出的脸都已被人物蒙版盖住，无需补漏")


class ChoukaSegMerge:
    """合并与编号：检出块 + 补漏块 → 按质心从左到右排序 → 稳定身份号。

    尺寸不一致直接报错而不是拉伸对齐：静默缩放会让身份层与原图错位，
    错位的蒙版回贴上去看起来像「打光照错了人」，比报错难查得多。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "masks": ("MASK",),
            },
            "optional": {
                "more_masks": ("MASK",),
                "image": ("IMAGE",),
            }
        }

    RETURN_TYPES = ("MASK", "INT", "INT", "STRING")
    RETURN_NAMES = ("ordered_masks", "count", "dropped", "entries_json")
    FUNCTION = "merge"
    CATEGORY = "chouka/分割"
    DESCRIPTION = "把多路蒙版汇成一份按左到右编号的身份序列，并给出逐身份条目。"

    def merge(self, masks, more_masks=None, image=None):
        collected = [(m.cpu().numpy() > 0.5).astype(np.uint8) for m in masks]
        if more_masks is not None:
            collected += [(m.cpu().numpy() > 0.5).astype(np.uint8) for m in more_masks]
        if image is not None:
            height, width = image.shape[1], image.shape[2]
            for mask in collected:
                if mask.shape != (height, width):
                    raise ValueError(
                        f"蒙版尺寸 {mask.shape[1]}x{mask.shape[0]} 与原图 {width}x{height} 不一致，"
                        "拒绝拉伸对齐")
        ordered = rules.order_by_centroid_x(collected)
        layer, dropped = rules.build_index_layer(ordered, ordered[0].shape if ordered
                                                 else (1, 1))
        entries = rules.index_layer_entries(layer) if ordered else []
        return (_masks_to_tensor(ordered), len(ordered), dropped,
                json.dumps({"count": len(ordered), "dropped": dropped, "entries": entries},
                           ensure_ascii=False))


class ChoukaSaveIdentityLayer:
    """身份索引层落盘：无损单通道 PNG（0=背景，1..255=身份号），服务端拿这一张图还原所有候选。

    为什么不用 SaveImage：它按 float×255 截断取整，1/255 这类值会掉到 0，
    身份号会串；这里直接按 uint8 L 模式写，一个号一位身份。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "ordered_masks": ("MASK",),
                "filename_prefix": ("STRING", {"default": "chouka/segidx"}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("INT", "STRING")
    RETURN_NAMES = ("count", "filename")
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "chouka/分割"
    DESCRIPTION = "把有序身份蒙版写成一张无损索引层 PNG。"

    def save(self, ordered_masks, filename_prefix="chouka/segidx", prompt=None,
             extra_pnginfo=None):
        import os

        import folder_paths
        from PIL import Image

        masks = [(m.cpu().numpy() > 0.5).astype(np.uint8) for m in ordered_masks]
        if not masks:
            # ui 里每一项都会被 ComfyUI 当成「可迭代的产物列表」逐个展开，放 int 进去会炸
            # 'int' object is not iterable —— 计数只走 result。
            return {"ui": {"images": []}, "result": (0, "")}
        layer, _dropped = rules.build_index_layer(masks, masks[0].shape)
        output_dir = folder_paths.get_output_directory()
        full_folder, filename, counter, subfolder, _prefix = folder_paths.get_save_image_path(
            filename_prefix, output_dir, layer.shape[1], layer.shape[0])
        name = f"{filename}_{counter:05}_.png"
        Image.fromarray(layer, mode="L").save(os.path.join(full_folder, name))
        entry = {"filename": name, "subfolder": subfolder, "type": "output"}
        return {"ui": {"images": [entry]},
                "result": (len(masks), f"{subfolder}/{name}" if subfolder else name)}
