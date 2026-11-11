"""Opt-in image sizing adapters; source workflows and sampling stay untouched."""
import math


RATIOS = (
    "1:1", "1:2", "2:1", "9:16", "16:9", "3:4", "4:3",
    "3:2", "2:3", "5:4", "4:5", "21:9", "9:21",
)
CLARITIES = {"480P": 480, "720P": 720, "1080P": 1080, "1440P": 1440, "2K": 2048, "4K": 4096}
_T2I_LATENTS = {
    "zimage_t2i": "41", "krea2_t2i": "2",
    "qwen_image_2512_t2i": "7", "qwen_image_21_t2i": "38",
}
_I2I_SCALES = {"zimage_i2i": "63", "qwen_image_edit_2511_i2i": "16"}
_I2I_LATENTS = {"krea2_i2i": ("2", "63"), "qwen_image_21_i2i": ("38", "1")}
_SIZE_NODE = "chouka_image_size"


def image_controls(capability_id):
    if capability_id in _T2I_LATENTS:
        return {"mode": "t2i", "defaultRatio": "3:4", "defaultClarity": "720P"}
    if capability_id in _I2I_SCALES or capability_id in _I2I_LATENTS:
        return {"mode": "i2i", "defaultRatio": "original", "defaultClarity": "720P"}
    return None


def bounded_dimensions(width, height):
    """Keep 16-aligned output within the shared 32-million-pixel budget."""
    max_pixels = 32_000_000
    if width * height > max_pixels:
        scale = math.sqrt(max_pixels / (width * height))
        width = max(16, math.floor(width * scale / 16) * 16)
        height = max(16, math.floor(height * scale / 16) * 16)
        if width * height > max_pixels:
            if width >= height:
                width = max_pixels // height // 16 * 16
            else:
                height = max_pixels // width // 16 * 16
    return width, height


def _dimensions(ratio, pixels):
    width, height = map(int, ratio.split(":"))
    # Align each side independently from the nominal short edge, matching JS Math.round.
    short = math.floor(pixels / 16 + .5) * 16
    if width >= height:
        return bounded_dimensions(math.floor(pixels * width / height / 16 + .5) * 16, short)
    return bounded_dimensions(short, math.floor(pixels * height / width / 16 + .5) * 16)


def patch_image_controls(graph, capability_id, params):
    if "image_ratio" not in params and "image_clarity" not in params:
        return
    controls = image_controls(capability_id)
    if controls is None:
        return
    ratio = params.get("image_ratio", controls["defaultRatio"])
    clarity = params.get("image_clarity", controls["defaultClarity"])
    ratios = RATIOS + (("original",) if controls["mode"] == "i2i" else ())
    if not isinstance(ratio, str) or ratio not in ratios:
        raise ValueError("image_ratio 必须为支持的比例字符串")
    if not isinstance(clarity, str) or clarity not in CLARITIES:
        raise ValueError("image_clarity 必须为 480P、720P、1080P、1440P、2K 或 4K")
    pixels = CLARITIES[clarity]
    if ratio != "original":
        width, height = _dimensions(ratio, pixels)
    # Original-ratio local sizing is resolved by the existing ComfyUI scale node.
    # Its short-edge interface has no pixel-budget input; enforcing a dynamic cap
    # would require changing the workflow chain, not just this sizing adapter.
    aligned_pixels = math.floor(pixels / 16 + .5) * 16

    if capability_id in _I2I_SCALES:
        inputs = graph[_I2I_SCALES[capability_id]]["inputs"]
        inputs.update(aspect_ratio="original", scale_to_side="shortest",
                      scale_to_length=aligned_pixels, round_to_multiple="16")
        if ratio != "original":
            inputs.update(aspect_ratio="custom", proportional_width=width,
                          proportional_height=height, scale_to_side="width",
                          scale_to_length=width, fit="crop")
        return

    if capability_id in _T2I_LATENTS:
        latent = _T2I_LATENTS[capability_id]
    else:
        latent, loader = _I2I_LATENTS[capability_id]
        if ratio == "original":
            # Only read the main image's scaled dimensions; keep the encoder's image chain.
            graph[_SIZE_NODE] = {
                "class_type": "LayerUtility: ImageScaleByAspectRatio V2",
                "inputs": {
                    "image": [loader, 0], "aspect_ratio": "original",
                    "proportional_width": 1, "proportional_height": 1,
                    "fit": "crop", "method": "lanczos", "round_to_multiple": "16",
                    "scale_to_side": "shortest", "scale_to_length": aligned_pixels,
                    "background_color": "#000000",
                },
                "_meta": {"title": "按原图比例设置输出尺寸"},
            }
            width, height = [_SIZE_NODE, 3], [_SIZE_NODE, 4]
    graph[latent]["inputs"].update(width=width, height=height)
