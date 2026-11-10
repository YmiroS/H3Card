"""CPU geometry, independent of torch/Comfy; IMAGE is [1,H,W,3], MASK [1,H,W].

Feather is an outward, finite-support blend in ORIGINAL pixels. Two separable
box filters have total radius `feather`; max(original, blurred) keeps selected
white pixels fully editable. Black pixels outside that support stay bit-exact.
"""
import math

import numpy as np
from PIL import Image


def canvas_side(megapixels):
    mp = float(megapixels)
    if not math.isfinite(mp) or not 0.25 <= mp <= 16.0:
        raise ValueError("megapixels must be finite and in [0.25,16]")
    # Budget and canvas limits are separate: e.g. 8.3MP is valid, but its
    # canvas side is capped at 2048. 32-alignment also satisfies Flux's 16.
    side = math.sqrt(mp * 1_000_000)
    return max(512, min(2048, int(math.floor(side / 32 + 0.5)) * 32))


def validate_image(image, name="image"):
    array = np.asarray(image)
    if (array.ndim != 4 or array.shape[0] != 1 or array.shape[-1] != 3
            or min(array.shape[1:3]) < 1):
        raise ValueError(f"{name} must be one RGB IMAGE [1,H,W,3] (batch=1)")
    if not np.issubdtype(array.dtype, np.floating) or not np.isfinite(array).all():
        raise ValueError(f"{name} must contain finite floating-point pixels")
    if np.any(array < 0) or np.any(array > 1):
        raise ValueError(f"{name} pixels must be in [0,1]")
    return array


def _box_axis(array, radius, axis):
    if radius == 0:
        return array
    # Constant zero outside the image. Float64 sums prevent distant nonzero
    # noise; support is explicitly clipped below regardless of roundoff.
    pads = [(0, 0)] * array.ndim
    pads[axis] = (radius, radius)
    padded = np.pad(array, pads)
    sums = np.cumsum(padded, axis=axis, dtype=np.float64)
    shape = list(sums.shape)
    shape[axis] = 1
    sums = np.concatenate((np.zeros(shape), sums), axis=axis)
    hi, lo = [slice(None)] * array.ndim, [slice(None)] * array.ndim
    hi[axis] = slice(2 * radius + 1, None)
    lo[axis] = slice(None, -(2 * radius + 1))
    return (sums[tuple(hi)] - sums[tuple(lo)]) / (2 * radius + 1)


def feather_mask(mask, feather):
    if isinstance(feather, bool) or int(feather) != feather or not 0 <= feather <= 128:
        raise ValueError("feather must be an integer in [0,128] original pixels")
    radius = int(feather)
    alpha = mask.astype(np.float64, copy=True)
    for r in (radius // 2, radius - radius // 2):
        for axis in (0, 1):
            alpha = _box_axis(alpha, r, axis)
    # Suppress floating-point summation residue, without removing mask values.
    alpha[alpha < 1e-12] = 0
    return np.maximum(mask, np.clip(alpha, 0, 1)).astype(np.float32)


def _resize_rgb(image, width, height):
    # PIL F channels avoid the 8-bit quantization of RGB conversion.
    if image.shape[:2] == (height, width):
        return image.copy()
    return np.stack([
        np.asarray(Image.fromarray(image[..., c].astype(np.float32)).resize(
            (width, height), Image.Resampling.BILINEAR))
        for c in range(3)
    ], axis=-1)


def crop_numpy(image, mask, megapixels=1.0, feather=32):
    base = validate_image(image).copy()
    mask = np.asarray(mask)
    if mask.shape != base.shape[:3]:
        raise ValueError("mask must be [1,H,W], batch=1, with the same image dimensions")
    if not np.isfinite(mask).all() or np.any(mask < 0) or np.any(mask > 1):
        raise ValueError("mask pixels must be finite and in [0,1]")
    original_mask = mask[0].astype(np.float32, copy=True)
    ys, xs = np.nonzero(original_mask > 0)
    if not len(xs):
        raise ValueError("mask is empty (white=edit, black=protect)")
    side = canvas_side(megapixels)
    alpha = feather_mask(original_mask, feather)
    height, width = base.shape[1:3]
    # 20% extra total context, plus the ENTIRE feather radius on each side.
    margin_x = math.ceil((xs.max() - xs.min() + 1) * 0.1) + int(feather)
    margin_y = math.ceil((ys.max() - ys.min() + 1) * 0.1) + int(feather)
    x0, x1 = max(0, int(xs.min()) - margin_x), min(width, int(xs.max()) + 1 + margin_x)
    y0, y1 = max(0, int(ys.min()) - margin_y), min(height, int(ys.max()) + 1 + margin_y)
    # Alpha was computed on the full original mask. The margins contain its
    # entire finite support; never crop or silently truncate the feather mask.
    crop_width, crop_height = x1 - x0, y1 - y0
    scale = side / max(crop_width, crop_height)
    resized_width = max(1, min(side, int(math.floor(crop_width * scale + 0.5))))
    resized_height = max(1, min(side, int(math.floor(crop_height * scale + 0.5))))
    left, top = (side - resized_width) // 2, (side - resized_height) // 2
    resized = _resize_rgb(base[0, y0:y1, x0:x1], resized_width, resized_height)
    # Edge padding supplies neutral context without changing the crop ratio.
    canvas = np.pad(resized, ((top, side - resized_height - top),
                             (left, side - resized_width - left), (0, 0)), mode="edge")
    context = {
        "version": 1, "base": base, "mask": original_mask, "alpha": alpha,
        "bbox": (x0, y0, x1, y1), "scale": scale,
        "padding": (left, top, side - resized_width - left, side - resized_height - top),
        "resized_size": (resized_width, resized_height), "expected_size": (side, side),
    }
    return canvas[None].astype(base.dtype), context, side, side


def stitch_numpy(generated, context):
    generated = validate_image(generated, "generated")
    expected_width, expected_height = context["expected_size"]
    height, width = generated.shape[1:3]
    if width * expected_height != height * expected_width:
        raise ValueError("generated aspect ratio differs from expected canvas; refusing to stretch")
    # Normalize the complete canvas first, then remove the EXACT recorded pad.
    # Works for any uniform output scale (e.g. a higher resolution Banana PNG).
    canvas = _resize_rgb(generated[0], expected_width, expected_height)
    left, top, _, _ = context["padding"]
    resized_width, resized_height = context["resized_size"]
    unpadded = canvas[top:top + resized_height, left:left + resized_width]
    x0, y0, x1, y1 = context["bbox"]
    edited = _resize_rgb(unpadded, x1 - x0, y1 - y0)
    result = context["base"].copy()
    base_crop = result[0, y0:y1, x0:x1]
    alpha = context["alpha"][y0:y1, x0:x1, None]
    blended = np.clip(base_crop * (1 - alpha) + edited * alpha, 0, 1)
    # Do NOT recompute protected pixels: assignment only touches alpha>0.
    active = alpha[..., 0] > 0
    base_crop[active] = blended[active]
    return result
