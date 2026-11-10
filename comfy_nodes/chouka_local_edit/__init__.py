"""Project-owned Comfy local material edit nodes; no Comfy/plugin imports needed.

Ports (zero-based): Crop -> IMAGE 0, CHOUKA_LOCAL_EDIT_CONTEXT 1, INT width 2,
INT height 3. Stitch -> IMAGE 0. CloudImageEdit -> IMAGE 0. LocalSaveImage is
an output-only sink with no data ports; its UI result contains the final file.
Mask must come from a separate LoadImageMask(channel='red'), white=edit.
"""
import copy

from .cloud import cloud_edit_numpy, ticket_cache_key
from .geometry import crop_numpy, stitch_numpy


def _numpy(tensor):
    return tensor.detach().cpu().numpy()


def _tensor(array):
    # Lazy import lets geometry/transport tests run on numpy/PIL-only Python.
    import torch
    return torch.from_numpy(array.copy())


class ChoukaLocalCrop:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "image": ("IMAGE",), "mask": ("MASK",),
            "megapixels": ("FLOAT", {"default": 1.0, "min": 0.25, "max": 16.0, "step": 0.01}),
            "feather": ("INT", {"default": 32, "min": 0, "max": 128}),
        }}

    RETURN_TYPES = ("IMAGE", "CHOUKA_LOCAL_EDIT_CONTEXT", "INT", "INT")
    RETURN_NAMES = ("image", "context", "width", "height")
    FUNCTION = "crop"
    CATEGORY = "Chouka/local_edit"

    def crop(self, image, mask, megapixels, feather):
        canvas, context, width, height = crop_numpy(_numpy(image), _numpy(mask), megapixels, feather)
        context["tensor_device"] = image.device
        context["tensor_dtype"] = image.dtype
        return _tensor(canvas), context, width, height


class ChoukaLocalStitch:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {"generated": ("IMAGE",), "context": ("CHOUKA_LOCAL_EDIT_CONTEXT",)}}

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "stitch"
    CATEGORY = "Chouka/local_edit"

    def stitch(self, generated, context):
        result = _tensor(stitch_numpy(_numpy(generated), context))
        return (result.to(device=context["tensor_device"], dtype=context["tensor_dtype"]),)


class ChoukaCloudImageEdit:
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "image": ("IMAGE",), "prompt": ("STRING", {"multiline": True, "default": ""}),
            "provider": (["gpt_image", "banana"],),
            "callback_url": ("STRING", {"default": ""}),
            "callback_token": ("STRING", {"default": ""}),
        }, "optional": {"reference": ("IMAGE",)}}

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "edit"
    CATEGORY = "Chouka/local_edit"

    def edit(self, image, prompt, provider, callback_url, callback_token, reference=None):
        output = cloud_edit_numpy(_numpy(image), prompt, provider, callback_url, callback_token,
                                  None if reference is None else _numpy(reference))
        return (_tensor(output),)

    @classmethod
    def IS_CHANGED(cls, image, prompt, provider, callback_url, callback_token, reference=None):
        # Unique task tickets invalidate the Comfy cache, without retaining a
        # raw ticket in this cache signature. Same task is NOT force-reexecuted.
        return ticket_cache_key(callback_token)


class ChoukaLocalSaveImage:
    """Core SaveImage with copied/redacted prompt metadata, never task tickets.

    EXTRA_PNGINFO is intentionally omitted: UI workflow widgets may embed the
    ticket positionally. This does not mutate the execution prompt or cache.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {
            "images": ("IMAGE",), "filename_prefix": ("STRING", {"default": "Chouka/local_edit"}),
        }, "hidden": {"prompt": "PROMPT", "extra_pnginfo": "EXTRA_PNGINFO"}}

    RETURN_TYPES = ()
    FUNCTION = "save_images"
    OUTPUT_NODE = True
    CATEGORY = "Chouka/local_edit"

    def save_images(self, images, filename_prefix="Chouka/local_edit", prompt=None, extra_pnginfo=None):
        from nodes import SaveImage
        safe_prompt = copy.deepcopy(prompt)
        if isinstance(safe_prompt, dict):
            for node in safe_prompt.values():
                if isinstance(node, dict) and node.get("class_type") == "ChoukaCloudImageEdit":
                    inputs = node.get("inputs", {})
                    inputs.pop("callback_token", None)
                    inputs.pop("callback_url", None)
        saved = SaveImage().save_images(images, filename_prefix, prompt=safe_prompt, extra_pnginfo=None)
        # Core versions differ on whether SaveImage also returns IMAGE. This
        # output-only wrapper exposes no data ports, only the final saved UI file.
        return {"ui": saved["ui"]}


NODE_CLASS_MAPPINGS = {
    "ChoukaLocalCrop": ChoukaLocalCrop,
    "ChoukaLocalStitch": ChoukaLocalStitch,
    "ChoukaCloudImageEdit": ChoukaCloudImageEdit,
    "ChoukaLocalSaveImage": ChoukaLocalSaveImage,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "ChoukaLocalCrop": "Chouka Local Crop",
    "ChoukaLocalStitch": "Chouka Local Stitch",
    "ChoukaCloudImageEdit": "Chouka Cloud Image Edit",
    "ChoukaLocalSaveImage": "Chouka Local Save Image (No Tickets)",
}
