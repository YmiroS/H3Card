"""手工补块节点：把「在图上点一下 / 框一下」的抠图回放从服务机搬到节点上。

这一档的原版口径是 rembg（u2net 通用 / u2net_human_seg 人像）出 alpha，
GrabCut 精修边界，点选还要沿自己那一列延到全身，最后 1.2 像素羽化。
数值部分全在 chouka_rules.py 里和服务端逐行对过，本文件只负责：
把 ComfyUI 的 IMAGE 张量换成 uint8 RGB、准备 alpha 回调、把结果按无损方式落盘。
"""
import json

import numpy as np
import torch

from . import chouka_models as models
from . import chouka_rules as rules


def _image_to_rgb(image):
    """ComfyUI IMAGE（[B,H,W,C] float 0..1）→ uint8 RGB。

    这里必须 rint 而不是直接 astype：张量是 uint8/255 得来的，浮点乘法会给出
    254.99998 这种值，截断取整等于整张图暗 1 个色阶，GrabCut 的颜色模型跟着变。
    """
    array = np.rint(np.clip(image[0].cpu().numpy(), 0, 1) * 255.0).astype(np.uint8)
    return array


class ChoukaU2netMask:
    """点选 / 框选手工补块：一个提示进、一块软蒙版出（一次只提交一个提示）。

    身份号是「蒙版从左到右排出来的」，一批提示里只要有一块空掉，后面的号就整体前移，
    回贴时打在错的人身上看不出来。所以这里不做批量，服务端要点几个人就派几次。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "mode": (["point", "box"],),
                "model_name": (models.combo(models.CUTOUT_CATEGORY,
                                            models.U2NET_HUMAN_MODEL_DEFAULT,
                                            suffixes=(".onnx",)),),
                "prompt_json": ("STRING", {"default": "", "multiline": True}),
            }
        }

    RETURN_TYPES = ("MASK", "FLOAT", "STRING", "STRING")
    RETURN_NAMES = ("mask", "coverage", "meta_json", "note")
    FUNCTION = "segment"
    CATEGORY = "chouka/分割"
    DESCRIPTION = "点选 / 框选补块（rembg + GrabCut + 沿列延伸 + 1.2 羽化）；缺权重时不静默出空蒙版。"

    def segment(self, image, mode, model_name, prompt_json):
        try:
            prompt = json.loads(prompt_json or "{}")
        except json.JSONDecodeError as error:
            raise ValueError(f"prompt_json 不是合法 JSON：{error}")
        session = models.cutout_session(model_name)
        if session is None:
            reason = models.cutout_error(model_name) or "权重或依赖不在位"
            raise ValueError(f"抠图权重不可用（{model_name}：{reason}），补块这一段没法回放")
        from rembg import remove

        def alpha_of(rgb):
            from PIL import Image

            pil = Image.fromarray(rgb)
            cut = remove(pil, session=session).split()[-1].resize(pil.size, Image.BILINEAR)
            return np.asarray(cut).astype("float32") / 255.0

        rgb = _image_to_rgb(image)
        # 提示不合法就当作业失败抛出去：回一张空蒙版会让出图「看起来成功了但没照着块打光」
        if mode == "point":
            point = prompt.get("point")
            if not (isinstance(point, (list, tuple)) and len(point) == 2):
                raise ValueError("prompt_json 缺 point：点选要 {\"point\": [x, y]} 归一化坐标")
            seg = rules.point_mask(rgb, alpha_of, point)
        else:
            box = prompt.get("box")
            if not (isinstance(box, (list, tuple)) and len(box) == 4):
                raise ValueError("prompt_json 缺 box：框选要 {\"box\": [x0, y0, x1, y1]} 归一化坐标")
            seg = rules.box_mask(rgb, alpha_of, box)
        mask = torch.from_numpy(np.asarray(seg["mask"], np.float32))[None, ...]
        meta = json.dumps({"box": [round(float(v), 6) for v in seg["box"]],
                           "coverage": round(float(seg["coverage"]), 8)}, ensure_ascii=False)
        return (mask, float(seg["coverage"]), meta,
                "" if seg["coverage"] > 0 else "这块提示没抠出前景，蒙版为空")


class ChoukaSaveMask:
    """软蒙版落盘：16 位单通道 PNG（0..65535 = 0..1），羽化的渐变必须整段带回去。

    为什么不用 ChoukaSaveIdentityLayer / SaveImage：身份层是硬边整数号，一张图一人一号；
    SaveImage 按 float×255 截断成 8 位。这两档都会把 1.2 像素的软边削成台阶，
    回贴时边缘比服务端那条老链更锐，看起来就是「节点算的和面板预览对不上」。
    """

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "mask": ("MASK",),
                "filename_prefix": ("STRING", {"default": "chouka/ckmask"}),
            },
            "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"},
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("filename",)
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "chouka/分割"
    DESCRIPTION = "把一张软蒙版写成无损 16 位 PNG，服务端按原尺寸取回。"

    def save(self, mask, filename_prefix="chouka/ckmask", prompt=None, extra_pnginfo=None):
        import os

        import folder_paths
        from PIL import Image

        if mask.shape[0] == 0:
            return {"ui": {"images": []}, "result": ("",)}
        array = (np.clip(mask[0].cpu().numpy(), 0, 1) * 65535.0).astype(np.uint16)
        output_dir = folder_paths.get_output_directory()
        full_folder, filename, counter, subfolder, _prefix = folder_paths.get_save_image_path(
            filename_prefix, output_dir, array.shape[1], array.shape[0])
        name = f"{filename}_{counter:05}_.png"
        Image.fromarray(array).save(os.path.join(full_folder, name))
        entry = {"filename": name, "subfolder": subfolder, "type": "output"}
        return {"ui": {"images": [entry]},
                "result": (f"{subfolder}/{name}" if subfolder else name,)}
