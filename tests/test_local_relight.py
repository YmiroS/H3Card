"""局部打光管线单测：纯回贴/接地/头肩数学 + 分割候选确定性（rembg 用假抠图替代）。

不触网、不调用云端；缺 numpy/cv2 的环境整体跳过，不算回归。
"""
from io import BytesIO
import sys
from pathlib import Path
import threading
import time
import unittest
from unittest import mock

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

try:
    import cv2  # noqa: F401
    import numpy as np
except Exception:  # pragma: no cover - 依赖缺失时跳过
    raise unittest.SkipTest("局部打光管线需要 numpy/cv2")

from server import local_relight as lr


def rgba_alpha(alpha):
    """把 float32 alpha 包成 rembg.remove 返回的 RGBA 图（matte 放在 A 通道）。"""
    array = (np.clip(alpha, 0, 1) * 255).astype("uint8")
    matte = Image.fromarray(array, "L")
    rgb = Image.new("RGB", matte.size, (128, 128, 128))
    return Image.merge("RGBA", (*rgb.split(), matte))


class CompositeTests(unittest.TestCase):
    def setUp(self):
        self.height, self.width = 120, 200
        self.base = np.full((self.height, self.width, 3), 100, np.float32)
        self.relit = np.full((self.height, self.width, 3), 220, np.float32)
        self.mask = np.zeros((self.height, self.width), np.float32)
        self.mask[30:90, 60:140] = 1.0

    def test_soft_composite_keeps_environment_and_takes_relight_inside(self):
        out = lr.composite(self.base, self.relit, self.mask, "soft")
        self.assertEqual(out[0, 0].tolist(), [100, 100, 100])
        self.assertEqual(out[60, 100].tolist(), [220, 220, 220])
        # 软过渡只在轮廓外几像素羽化；远离蒙版的背景列必须逐像素不变。
        far = np.zeros(self.mask.shape, bool)
        far[:, :20] = True
        far[:, -20:] = True
        self.assertTrue(np.array_equal(out[far], self.base[far].astype("uint8")))

    def test_tight_composite_also_preserves_far_background(self):
        out = lr.composite(self.base, self.relit, self.mask, "tight")
        self.assertEqual(out[0, 0].tolist(), [100, 100, 100])
        self.assertEqual(out[60, 100].tolist(), [220, 220, 220])

    def test_empty_mask_returns_base_unchanged(self):
        empty = np.zeros((self.height, self.width), np.float32)
        out = lr.composite(self.base, self.relit, empty, "soft")
        self.assertTrue(np.array_equal(out, self.base.astype("uint8")))


class PreserveShapeTests(unittest.TestCase):
    """搬光不搬形：明暗倍率来自模型图，像素细节一律留原图。"""

    def setUp(self):
        self.height, self.width = 120, 200
        xs = np.arange(self.width)
        stripe = np.where((xs // 6) % 2 == 0, 60, 100).astype("float32")
        self.base = np.stack([np.repeat(stripe[None, :], self.height, axis=0)] * 3, -1)
        # 模型把竖条纹抹平成纯色：形状丢了、整体变亮
        self.lit = np.full((self.height, self.width, 3), 220, np.float32)

    def test_zero_weight_leaves_lit_untouched(self):
        out = lr.preserve_shape(self.base, self.lit, np.zeros((self.height, self.width), np.float32),
                                sigma=8.0)
        self.assertTrue(np.array_equal(out, np.full((self.height, self.width, 3), 220, "uint8")))

    def test_empty_weight_without_sigma_still_returns_lit(self):
        out = lr.preserve_shape(self.base, self.lit, np.zeros((self.height, self.width), np.float32))
        self.assertTrue(np.array_equal(out, np.full((self.height, self.width, 3), 220, "uint8")))

    def test_full_weight_keeps_stripes_and_takes_lit_brightness(self):
        out = lr.preserve_shape(self.base, self.lit, np.ones((self.height, self.width), np.float32),
                                sigma=8.0)
        row = out[60, :, 0]
        # 竖条纹还在，且明暗相位与原图一致（贴模型像素的话整行会是平的 220）
        self.assertGreater(float(row.std()), 20.0)
        dark = row[((np.arange(self.width) // 6) % 2) == 0]
        light = row[((np.arange(self.width) // 6) % 2) == 1]
        self.assertLess(float(dark.mean()), float(light.mean()))
        # 亮度整体被搬上去了：均值得明显高于原图的 80
        self.assertGreater(float(row.mean()), 120.0)

    def test_gain_is_clamped(self):
        """原图极暗、模型极亮时倍率封顶，免得把噪点放大成一团。"""
        dark = np.full((self.height, self.width, 3), 8, np.float32)
        out = lr.preserve_shape(dark, self.lit, np.ones((self.height, self.width), np.float32),
                                sigma=8.0)
        self.assertLessEqual(int(out.max()), int(round(8 * lr.FACE_GUARD["ceil"])) + 1)


class FaceGuardTests(unittest.TestCase):
    def test_head_region_gets_original_structure_back(self):
        height, width = 200, 200
        xs = np.arange(width)
        stripe = np.where((xs // 6) % 2 == 0, 60, 100).astype("float32")
        base = np.stack([np.repeat(stripe[None, :], height, axis=0)] * 3, -1)
        lit = np.full((height, width, 3), 200, "uint8")
        mask = np.zeros((height, width), np.float32)
        mask[10:190, 60:140] = 1.0
        out = lr.face_guard(base, lit, mask, [[0.3, 0.05, 0.7, 0.95]])
        head_row = out[40, 70:130, 0]
        body_row = out[150, 70:130, 0]
        # 头部：条纹回来了（保形）；身体：维持成图像素不被这段改动
        self.assertGreater(float(head_row.std()), 20.0)
        self.assertEqual(int(body_row.min()), 200)
        self.assertEqual(int(body_row.max()), 200)

    def test_outside_person_mask_is_untouched(self):
        height, width = 160, 160
        base = np.full((height, width, 3), 90, np.float32)
        lit = np.full((height, width, 3), 180, "uint8")
        mask = np.zeros((height, width), np.float32)
        mask[20:140, 20:140] = 1.0
        out = lr.face_guard(base, lit, mask, [[0.2, 0.1, 0.8, 0.9]])
        self.assertEqual(set(out[2, :, 0].tolist()), {180})


class CompositeRingTests(unittest.TestCase):
    def test_background_content_survives_outside_the_mask(self):
        """蒙版外只搬低频光照，模型重绘的背景内容不能被贴进来。"""
        height, width = 160, 200
        xs = np.arange(width)
        stripe = np.where((xs // 6) % 2 == 0, 60, 110).astype("float32")
        base = np.stack([np.repeat(stripe[None, :], height, axis=0)] * 3, -1)
        ys = np.arange(height)
        rows = np.where((ys // 6) % 2 == 0, 60, 110).astype("float32")
        relit = np.stack([np.repeat(rows[:, None], width, axis=1)] * 3, -1)
        mask = np.zeros((height, width), np.float32)
        mask[60:100, 90:110] = 1.0
        out = lr.composite(base, relit, mask, "soft")
        self.assertTrue(np.array_equal(out[70:90, 96:104, 0],
                                       relit[70:90, 96:104, 0].astype("uint8")))
        # 远处背景仍是原图的竖条纹，而不是模型的横条纹
        far = out[0, 30:70, 0]
        self.assertGreater(float(far.std()), 10.0)
        self.assertLess(int(np.abs(far.astype("int16")
                                   - base[0, 30:70, 0].astype("int16")).max()), 3)


class BackgroundLightTests(unittest.TestCase):
    def test_dark_person_does_not_smear_into_background(self):
        """人物被压暗后，紧贴轮廓的背景不能跟着变暗——那就是贴纸边的来源。"""
        height, width = 160, 200
        base = np.full((height, width, 3), 120, np.float32)
        relit = base.copy()
        relit[60:100, 90:110] = 20.0
        solid = np.zeros((height, width), np.float32)
        solid[60:100, 90:110] = 1.0
        photo = lr.background_light(base, relit, solid.astype("uint8"), 30.0)
        near = photo[54:59, 92:108, 0].astype("int16")
        self.assertLess(int(np.abs(near - 120).max()), 6)

    def test_whole_scene_light_change_still_transfers(self):
        """背景整体变亮时，外圈搬光仍要把这份亮度搬进原图背景。"""
        height, width = 120, 200
        base = np.full((height, width, 3), 100, np.float32)
        relit = np.full((height, width, 3), 150, np.float32)
        solid = np.zeros((height, width), np.float32)
        solid[50:70, 90:110] = 1.0
        photo = lr.background_light(base, relit, solid.astype("uint8"), 20.0)
        self.assertGreater(float(photo[0, 0, 0]), 140)


class TintMatchTests(unittest.TestCase):
    def setUp(self):
        self.height, self.width = 160, 200
        self.out = np.full((self.height, self.width, 3), 140, "uint8")
        self.out[60:100, 40:120] = (60, 60, 140)  # 人物被拉冷，环境保持中性
        self.mask = np.zeros((self.height, self.width), np.float32)
        self.mask[60:100, 40:120] = 1.0

    def test_cool_person_pulled_toward_scene_without_changing_brightness(self):
        """色调回拉只动色度：人物与环境的冷暖差要收小，亮度基本不动。"""
        before = cv2.cvtColor(self.out, cv2.COLOR_RGB2LAB).astype("float32")
        after = cv2.cvtColor(lr.tint_match(self.out, self.mask, 1.0),
                             cv2.COLOR_RGB2LAB).astype("float32")
        fg, bg = self.mask > 0.5, self.mask <= 0.5

        def gap(arr):
            return float(arr[..., 2][fg].mean() - arr[..., 2][bg].mean())

        self.assertLess(abs(gap(after)), abs(gap(before)) * 0.5)
        # 亮度用 Rec.709 权重直接量：OpenCV 的 L 通道不是这套增益的定义域
        weights = np.array([0.2126, 0.7152, 0.0722], np.float32)
        luma = lambda arr: float((np.asarray(arr, "float32") * weights).sum(axis=2)[fg].mean())
        fixed = lr.tint_match(self.out, self.mask, 1.0)
        self.assertLess(abs(luma(fixed) - luma(self.out)), 1.5)

    def test_zero_amount_returns_input_unchanged(self):
        self.assertTrue(np.array_equal(lr.tint_match(self.out, self.mask, 0), self.out))

    def test_empty_mask_returns_input_unchanged(self):
        blank = np.zeros((self.height, self.width), np.float32)
        self.assertTrue(np.array_equal(lr.tint_match(self.out, blank, 1.0), self.out))


class TuningTests(unittest.TestCase):
    """面板微调：传进来的值必须真的改变这一步的行为，不传时保持内置档。"""

    def test_ring_frac_changes_how_wide_the_rim_transfer_is(self):
        ys = np.arange(160, dtype="float32")
        relit = np.stack([(120.0 + 60.0 * ys / 160.0)[:, None].repeat(200, axis=1)] * 3, -1)
        base = np.full((160, 200, 3), 120, np.float32)
        relit[60:100, 90:110] = 20.0
        mask = np.zeros((160, 200), np.float32)
        mask[60:100, 90:110] = 1.0
        tight = lr.composite(base, relit, mask, "soft", ring_frac=0.08)
        wide = lr.composite(base, relit, mask, "soft", ring_frac=0.35)
        band = (slice(48, 59), slice(88, 112))
        self.assertGreater(float(np.abs(wide[band] - tight[band]).mean()), 1.0)
        self.assertTrue(np.array_equal(lr.composite(base, relit, mask, "soft"),
                                       lr.composite(base, relit, mask, "soft",
                                                    ring_frac=lr.RING_SIGMA_FRAC)))

    def test_edge_falloff_controls_how_far_the_blend_reaches(self):
        base = np.full((160, 200, 3), 120, np.float32)
        relit = np.full((160, 200, 3), 40, np.float32)
        mask = np.zeros((160, 200), np.float32)
        mask[60:100, 90:110] = 1.0
        narrow = lr.composite(base, relit, mask, "soft", falloff=2.0)
        wide = lr.composite(base, relit, mask, "soft", falloff=14.0)
        band = (slice(50, 58), slice(92, 108))
        self.assertGreater(float(base[band].mean() - wide[band].mean()),
                           float(base[band].mean() - narrow[band].mean()) + 5)
        self.assertTrue(np.array_equal(lr.composite(base, relit, mask, "soft"),
                                       lr.composite(base, relit, mask, "soft",
                                                    falloff=lr.EDGE_FALLOFF)))

    def test_zeroing_grounding_strengths_leaves_the_ground_alone(self):
        height, width = 200, 200
        base = np.full((height, width, 3), 150, np.float32)
        mask = np.zeros((height, width), np.float32)
        mask[60:180, 80:120] = 1.0
        off = lr.grounding(base, base, mask, 45.0, shadow_strength=0.0, pool_strength=0.0)
        on = lr.grounding(base, base, mask, 45.0)
        ground = (slice(182, 198), slice(82, 118))
        self.assertLess(float(on[ground][0].mean()), float(base[ground][0].mean()) - 5)
        self.assertLess(int(np.abs(off.astype("int16")
                                   - base.astype("uint8").astype("int16")).max()), 2)

    def test_head_ratio_widens_the_area_kept_from_the_original(self):
        height, width = 200, 200
        xs = np.arange(width)
        stripe = np.where((xs // 4) % 2 == 0, 60, 190).astype("float32")
        base = np.stack([np.repeat(stripe[None, :], height, axis=0)] * 3, -1)
        flat = np.full((height, width, 3), 125, np.float32)
        mask = np.zeros((height, width), np.float32)
        mask[20:180, 60:140] = 1.0
        boxes = [(0.3, 0.1, 0.7, 0.9)]
        small = lr.face_guard(base, flat, mask, boxes, head_ratio=0.25)
        large = lr.face_guard(base, flat, mask, boxes, head_ratio=0.55)
        self.assertGreater(float(large[100, 60:140, 0].std()),
                           float(small[100, 60:140, 0].std()))

    def test_guard_sigma_changes_how_coarse_the_transferred_light_is(self):
        height, width = 160, 200
        base = np.full((height, width, 3), 100, np.float32)
        lit = np.zeros((height, width, 3), np.float32)
        lit[:, :100] = 180.0
        weight = np.ones((height, width), np.float32)
        fine = lr.preserve_shape(base, lit, weight, sigma_frac=0.05)
        coarse = lr.preserve_shape(base, lit, weight, sigma_frac=0.40)
        self.assertGreater(float(np.abs(fine - coarse).mean()), 5.0)


class MaskTests(unittest.TestCase):
    def test_union_mask_takes_maximum(self):
        a = np.zeros((10, 10), np.float32)
        b = np.zeros((10, 10), np.float32)
        a[2:5, 2:5] = 0.6
        b[3:6, 3:6] = 0.9
        union = lr.union_mask([a, b], (10, 10))
        self.assertAlmostEqual(float(union[4, 4]), 0.9, places=5)
        self.assertAlmostEqual(float(union[2, 2]), 0.6, places=5)

    def test_union_of_nothing_is_zero(self):
        self.assertFalse(lr.union_mask([], (8, 8)).any())

    def test_mask_data_url_roundtrip(self):
        mask = np.zeros((64, 96), np.float32)
        mask[16:48, 24:72] = 1.0
        url = lr.mask_to_data_url(mask, side=96)
        self.assertTrue(url.startswith("data:image/png;base64,"))
        import base64
        raw = base64.b64decode(url.split(",", 1)[1])
        decoded = lr.decode_mask(raw, (96, 64))
        self.assertEqual(decoded.shape, (64, 96))
        self.assertAlmostEqual(float(decoded[32, 48]), 1.0, places=2)
        self.assertAlmostEqual(float(decoded[0, 0]), 0.0, places=2)


class IdentityLayerTests(unittest.TestCase):
    """手工分割索引层的解码与重采样（放大不许造身份，缩小按面积落边）。"""

    def png(self, array, mode="L"):
        image = Image.fromarray(array, mode)
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    def two_tone(self, width=40, height=20):
        layer = np.zeros((height, width), np.uint8)
        layer[:, : width // 2] = 1
        layer[:, width // 2:] = 2
        return layer

    def test_same_size_roundtrip_keeps_every_identity(self):
        layer = np.zeros((20, 30), np.uint8)
        layer[2:10, 1:8] = 1
        layer[5:18, 12:25] = 7
        layer[0:4, 26:30] = 255
        out = lr.decode_identity_layer(self.png(layer), (30, 20))
        self.assertEqual(out.dtype, np.uint8)
        self.assertTrue(np.array_equal(out, layer))

    def test_upscale_never_invents_a_third_identity(self):
        out = lr.decode_identity_layer(self.png(self.two_tone()), (60, 30))
        self.assertEqual(set(np.unique(out).tolist()), {1, 2})
        self.assertEqual(int((out == 1).sum()), 30 * 30)
        self.assertEqual(int(out[15, 29]), 1)
        self.assertEqual(int(out[15, 30]), 2)

    def test_downscale_keeps_both_identities_separate(self):
        out = lr.decode_identity_layer(self.png(self.two_tone()), (26, 13))
        self.assertEqual(out.shape, (13, 26))
        self.assertTrue(set(np.unique(out).tolist()) <= {0, 1, 2})
        counts = [int((out == value).sum()) for value in (1, 2)]
        self.assertTrue(all(count > 0 for count in counts), counts)
        # 两个身份各占一半附近，边界不许出现「第三种身份」或整块被吃掉
        self.assertLessEqual(abs(counts[0] - counts[1]), 26)

    def test_exact_two_x_downscale_keeps_both_sides_whole(self):
        out = lr.decode_identity_layer(self.png(self.two_tone()), (20, 10))
        # 整数倍缩小按 2×2 块对齐取面积：接缝不会因采样相位掉一列身份
        self.assertEqual(int((out == 1).sum()), 100)
        self.assertEqual(int((out == 2).sum()), 100)
        self.assertEqual(int(out[5, 9]), 1)
        self.assertEqual(int(out[5, 10]), 2)

    def test_downscale_keeps_a_narrow_band(self):
        layer = np.zeros((20, 60), np.uint8)
        layer[:, 20:26] = 2
        out = lr.decode_identity_layer(self.png(layer), (20, 10))
        # 6 宽的条缩 3 倍应有 2 列，不能整条消失也不能糊成 3 列
        self.assertEqual(int((out == 2).sum()), 2 * 10)
        self.assertEqual(set(np.unique(out).tolist()), {0, 2})

    def test_background_only_layer_decodes_to_all_zero(self):
        out = lr.decode_identity_layer(self.png(np.zeros((12, 16), np.uint8)), (32, 24))
        self.assertEqual(out.shape, (24, 32))
        self.assertFalse(out.any())

    def test_rgba_carrier_reads_the_index_from_the_red_channel(self):
        layer = self.two_tone()
        rgba = np.dstack([layer, layer, layer, np.zeros(layer.shape, np.uint8)])
        out = lr.decode_identity_layer(self.png(rgba, "RGBA"), (20, 10))
        # 透明通道不参与合成：索引号只认 R，否则全透明的位图会被抹平成一片背景
        self.assertGreater(int((out == 1).sum()), 50)
        self.assertGreater(int((out == 2).sum()), 50)


class GroundingTests(unittest.TestCase):
    def test_grounding_only_darkens_outside_mask(self):
        height, width = 200, 200
        base = np.full((height, width, 3), 150, np.float32)
        mask = np.zeros((height, width), np.float32)
        mask[20:190, 80:120] = 1.0
        out = lr.grounding(base.astype("uint8"), base, mask, key_azimuth=45.0)
        outside = mask < 0.01
        # 接地只压暗脚下地面，绝不会把蒙版外照亮。
        self.assertTrue(np.all(out[outside].astype("int16") <= base[outside].astype("int16") + 1))

    def test_grounding_slope_follows_key_azimuth(self):
        height, width = 120, 120
        base = np.full((height, width, 3), 160, np.float32)
        mask = np.zeros((height, width), np.float32)
        mask[10:110, 50:70] = 1.0
        left = lr.grounding(base.astype("uint8"), base, mask, key_azimuth=0.0)
        right = lr.grounding(base.astype("uint8"), base, mask, key_azimuth=180.0)
        self.assertFalse(np.array_equal(left, right))

    def test_grounding_without_azimuth_is_symmetric(self):
        """A6：没灯位（key_azimuth 为空）时坡向取 0，与 90° 一样左右对称，不偏出一道假阴影。"""
        height, width = 120, 120
        base = np.full((height, width, 3), 160, np.float32)
        mask = np.zeros((height, width), np.float32)
        mask[10:110, 50:70] = 1.0
        no_light = lr.grounding(base.astype("uint8"), base, mask)
        flat = lr.grounding(base.astype("uint8"), base, mask, key_azimuth=90.0)
        self.assertTrue(np.array_equal(no_light, flat))


class HeadTests(unittest.TestCase):
    def test_head_box_takes_upper_ratio(self):
        box = lr.head_box([0.2, 0.1, 0.6, 0.9], 0.4)
        self.assertEqual(box[:3], [0.2, 0.1, 0.6])
        self.assertAlmostEqual(box[3], 0.42, places=6)

    def test_blend_head_zero_weight_returns_base(self):
        base = np.full((80, 80, 3), 120, np.uint8)
        weight = np.zeros((80, 80), np.float32)
        crop = Image.fromarray(base[10:40, 10:40])
        out = lr.blend_head(base, crop, [0.1, 0.1, 0.5, 0.5], weight)
        self.assertTrue(np.array_equal(out, base))

    def test_blend_head_identical_model_changes_nothing(self):
        rng = np.random.default_rng(0)
        base = rng.integers(0, 255, (80, 80, 3), dtype="uint8")
        weight = np.ones((80, 80), np.float32)
        crop = Image.fromarray(base[16:48, 16:48])
        out = lr.blend_head(base, crop, [0.2, 0.2, 0.6, 0.6], weight)
        self.assertTrue(np.array_equal(out, base))


class SegmentationTests(unittest.TestCase):
    """用假抠图验证候选拆分与确定性排序，不依赖真实模型权重。"""

    def _fake_two_people(self, width, height):
        alpha = np.zeros((height, width), np.float32)
        alpha[10:90, 20:70] = 1.0
        alpha[10:90, 120:180] = 1.0
        return alpha

    def test_persons_sorted_left_to_right_with_stable_ids(self):
        image = Image.new("RGB", (200, 100), "black")
        alpha = self._fake_two_people(200, 100)
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            people = lr.segment_persons(image)
        self.assertEqual(len(people), 2)
        self.assertLess(people[0]["cx"], people[1]["cx"])
        for person in people:
            self.assertEqual(len(person["box"]), 4)
            self.assertTrue(all(0 <= v <= 1 for v in person["box"]))
            self.assertEqual(person["mask"].shape, (100, 200))
            self.assertGreater(person["coverage"], 0)

    def test_tiny_specks_are_not_people(self):
        image = Image.new("RGB", (200, 100), "black")
        alpha = np.zeros((100, 200), np.float32)
        alpha[50:52, 100:102] = 1.0
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            people = lr.segment_persons(image)
        self.assertEqual(people, [])

    def test_segment_box_returns_full_size_mask_and_normalized_box(self):
        image = Image.new("RGB", (200, 100), "black")
        alpha = np.ones((100, 80), np.float32)
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            seg = lr.segment_box(image, [0.3, 0.1, 0.7, 0.9])
        self.assertEqual(seg["mask"].shape, (100, 200))
        self.assertEqual(len(seg["box"]), 4)
        self.assertTrue(all(0 <= v <= 1 for v in seg["box"]))
        self.assertGreaterEqual(seg["coverage"], 0)
        self.assertLessEqual(seg["coverage"], 1)

    def test_segment_point_returns_full_size_mask_inside_the_person_column(self):
        image = Image.new("RGB", (200, 100), "black")
        alpha = np.ones((100, 200), np.float32)
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            seg = lr.segment_point(image, [0.5, 0.5])
        self.assertEqual(seg["mask"].shape, (100, 200))
        self.assertEqual(len(seg["box"]), 4)
        self.assertTrue(all(0 <= v <= 1 for v in seg["box"]))
        self.assertGreaterEqual(seg["coverage"], 0)
        self.assertLessEqual(seg["coverage"], 1)
        # 横向只占这一个人自己的列，不会往左右邻居身上长。
        x0, y0, x1, y1 = seg["box"]
        self.assertLessEqual(x1 - x0, lr.POINT_WINDOW[0] + 0.08)
        # 纵向可以补到全身（蒙版会沿这一列往下延伸）。
        self.assertLessEqual(y1 - y0, 1.0)
        self.assertGreaterEqual(y1 - y0, lr.POINT_WINDOW[1] - 0.02)

    def test_segment_point_does_not_pull_in_the_neighbouring_person(self):
        rng = np.random.default_rng(7)
        image = Image.fromarray(rng.integers(0, 255, (100, 200, 3), dtype=np.uint8), "RGB")
        alpha = np.zeros((100, 200), np.float32)
        alpha[:, 20:60] = 1.0
        alpha[:, 120:160] = 1.0
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            seg = lr.segment_point(image, [0.2, 0.5])
        mask = seg["mask"] > 0.5
        self.assertTrue(mask[:, 20:60].any())
        self.assertFalse(mask[:, 120:160].any())

    def test_segment_point_clamps_window_at_image_edge(self):
        image = Image.new("RGB", (200, 100), "black")
        alpha = np.ones((100, 200), np.float32)
        with mock.patch("rembg.new_session", return_value=object()), \
                mock.patch("rembg.remove", return_value=rgba_alpha(alpha)):
            seg = lr.segment_point(image, [0.0, 0.0])
        x0, y0, x1, y1 = seg["box"]
        self.assertGreaterEqual(x0, 0)
        self.assertGreaterEqual(y0, 0)
        self.assertLessEqual(x1, 1)
        self.assertLessEqual(y1, 1)
        self.assertGreater(x1, x0)
        self.assertGreater(y1, y0)


class _FakeTensor:
    """扮 ultralytics 的 torch 张量：只需要 cpu().numpy() 这一小段链。"""

    def __init__(self, array):
        self._array = array

    def cpu(self):
        return self

    def numpy(self):
        return self._array


def _fake_seg_result(masks=None, boxes_xyxy=None):
    result = mock.Mock()
    result.masks = mock.Mock(data=_FakeTensor(masks)) if masks is not None else None
    result.boxes = None if boxes_xyxy is None else mock.Mock(xyxy=_FakeTensor(boxes_xyxy))
    return result


class _FakeSam:
    """扮 SAM2ImagePredictor：box 提示固定吐一块预设蒙版。"""

    def __init__(self, mask):
        self._mask = mask

    def set_image(self, _rgb):
        pass

    def predict(self, box, multimask_output):
        return [self._mask], None, None


class YoloSegmentationTests(unittest.TestCase):
    """实例分割主路：YOLO 蒙版 → 补洞闭运算 → 面积过滤 → 人脸锚点补漏（模型全 mock）。"""

    def _predictors(self, person_result, face_result=None):
        mapping = {}
        person = mock.Mock()
        person.predict.return_value = [person_result]
        mapping["person.pt"] = person
        if face_result is not None:
            face = mock.Mock()
            face.predict.return_value = [face_result]
            mapping["face.pt"] = face
        return mapping

    def test_touching_people_come_out_as_separate_candidates(self):
        """贴在一起的人各出一张蒙版——这是实例分割对整图抠图的核心赢面。"""
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((2, 100, 200), np.float32)
        masks[0, 10:90, 20:90] = 0.9
        masks[1, 10:90, 90:160] = 0.9
        predictors = self._predictors(_fake_seg_result(masks=masks))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", None)), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 2)
        self.assertLess(people[0]["cx"], people[1]["cx"])
        for person in people:
            self.assertEqual(person["mask"].shape, (100, 200))
            self.assertEqual(len(person["box"]), 4)
            self.assertTrue(all(0 <= v <= 1 for v in person["box"]))
            self.assertGreater(person["coverage"], 0)

    def test_small_instances_are_filtered_by_min_area(self):
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((2, 100, 200), np.float32)
        masks[0, 10:90, 20:100] = 0.9
        masks[1, 50:52, 150:152] = 0.9
        predictors = self._predictors(_fake_seg_result(masks=masks))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", None)), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 1)
        self.assertLess(people[0]["box"][0], 0.5)

    def test_face_anchor_recovers_missed_person(self):
        """脸检出了但不在任何人物蒙版里 = 漏检，扩框补一块回来。"""
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((1, 100, 200), np.float32)
        masks[0, 10:90, 10:80] = 0.9
        recovered = np.zeros((100, 200), np.float32)
        recovered[10:90, 120:170] = 1.0
        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[130, 12, 150, 32]], np.float32)))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=_FakeSam(recovered)):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 2)
        self.assertGreater(people[1]["box"][0], 0.5)

    def test_covered_face_does_not_trigger_recovery(self):
        """已检出人的脸不重复补（只补漏不精修）。"""
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((1, 100, 200), np.float32)
        masks[0, 10:90, 10:80] = 0.9
        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[20, 12, 40, 32]], np.float32)))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=_FakeSam(np.ones((100, 200), np.float32))):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 1)

    def test_face_inside_detected_person_box_does_not_spawn_fragment(self):
        """蒙版没盖到脸但脸框在已检出人的包围盒内 = 同一人，不补碎片（骑手低头案）。"""
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((1, 100, 200), np.float32)
        masks[0, 10:40, 10:80] = 0.9   # 横臂
        masks[0, 40:90, 10:30] = 0.9   # 竖臂，脸的位置是空的
        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[50, 60, 70, 80]], np.float32)))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=_FakeSam(np.ones((100, 200), np.float32))):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 1)

    def test_tiny_face_does_not_trigger_recovery(self):
        """不足图宽 0.5% 的小脸不补——大图上的妆花/兽纹会被脸模型误报（兽首铠甲案）。"""
        image = Image.new("RGB", (2000, 1000), "black")
        masks = np.zeros((1, 1000, 2000), np.float32)
        masks[0, 100:900, 100:800] = 0.9
        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[100, 100, 108, 116]], np.float32)))
        sam = mock.Mock()
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=sam):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 1)
        sam.predict.assert_not_called()

    def test_overlapping_recoveries_dedup_to_largest(self):
        """同一张脸被报两次 = 同一人，只留大块：蒙版重叠或脸框贴近都算。"""
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((1, 100, 200), np.float32)
        masks[0, 10:90, 10:80] = 0.9
        big = np.zeros((100, 200), np.float32)
        big[10:90, 120:170] = 1.0
        small = np.zeros((100, 200), np.float32)
        small[10:40, 172:195] = 1.0  # 与大块只挨着不重叠，靠脸框距离去重

        class _Sam:
            def set_image(self, _rgb):
                pass

            def predict(self, box, multimask_output):
                return [big if box[0][0] < 100 else small], None, None

        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[130, 12, 150, 32], [140, 12, 160, 32]], np.float32)))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=_Sam()):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 2)
        self.assertGreater(people[1]["box"][2] - people[1]["box"][0], 0.2)

    def test_recovery_skipped_when_sam_missing(self):
        image = Image.new("RGB", (200, 100), "black")
        masks = np.zeros((1, 100, 200), np.float32)
        masks[0, 10:90, 10:80] = 0.9
        predictors = self._predictors(
            _fake_seg_result(masks=masks),
            _fake_seg_result(boxes_xyxy=np.array([[130, 12, 150, 32]], np.float32)))
        with mock.patch.object(lr, "_seg_weights", return_value=("person.pt", "face.pt")), \
                mock.patch.object(lr, "_seg_yolo", side_effect=lambda path: predictors[path]), \
                mock.patch.object(lr, "_seg_sam", return_value=None):
            people = lr.segment_persons_yolo(image)
        self.assertEqual(len(people), 1)

    def test_postfix_fills_holes_and_closes_gaps(self):
        mask = np.zeros((30, 30), np.float32)
        mask[5:25, 5:25] = 1.0
        mask[12:16, 12:16] = 0.0
        filled = lr._seg_postfix(cv2, np, mask)
        self.assertEqual(int(filled[13, 13]), 1)

    def test_segment_auto_prefers_yolo_when_available(self):
        with mock.patch.object(lr, "yolo_available", return_value=True), \
                mock.patch.object(lr, "segment_persons_yolo", return_value=["yolo"]) as yolo, \
                mock.patch.object(lr, "segment_persons", return_value=["rembg"]) as rembg:
            self.assertEqual(lr.segment_auto(Image.new("RGB", (8, 8))), ["yolo"])
        yolo.assert_called_once()
        rembg.assert_not_called()

    def test_segment_auto_falls_back_to_rembg(self):
        with mock.patch.object(lr, "yolo_available", return_value=False), \
                mock.patch.object(lr, "segment_persons_yolo", return_value=["yolo"]) as yolo, \
                mock.patch.object(lr, "segment_persons", return_value=["rembg"]) as rembg:
            self.assertEqual(lr.segment_auto(Image.new("RGB", (8, 8))), ["rembg"])
        rembg.assert_called_once()
        yolo.assert_not_called()


class _SharedSam:
    """扮进程级 SAM2 单例：把 set_image / predict 的调用顺序记进 events。

    set_image 落库后再 sleep，模拟真实 predictor 吃一张图的几十毫秒——
    这正是另一线程挤进来把自己的图覆盖掉的窗口（没锁时必现串图）。
    """

    def __init__(self, events):
        self.events = events
        self.shape = None

    def set_image(self, rgb):
        self.shape = (int(rgb.shape[0]), int(rgb.shape[1]))
        self.events.append("set")
        time.sleep(0.02)

    def predict(self, box, multimask_output):
        self.events.append("predict")
        height, width = self.shape
        return [np.ones((height, width), bool)], None, None


class Sam2LockTests(unittest.TestCase):
    """SAM2 单例并发串行化：每个线程只拿到自己那张图切出来的蒙版。

    面板识别与出图共用进程级 predictor，set_image 与 predict 之间原本无同步：
    后一次 set_image 会盖掉前一次，出图拿到别人图的蒙版（同尺寸连报错都没有）。
    """

    SIZES = [("a", (60, 60)), ("b", (40, 80)), ("c", (100, 50))]

    def _concurrent_runs(self):
        """三线程各拿不同尺寸的图，共用同一个假 predictor 跑补漏。"""
        events = []
        sam = _SharedSam(events)
        face = mock.Mock()
        face.predict.return_value = [_fake_seg_result(
            boxes_xyxy=np.array([[10, 10, 20, 20]], np.float32))]
        results, errors = {}, {}

        def worker(name, shape):
            height, width = shape
            img = np.zeros((height, width, 3), np.uint8)
            try:
                results[name] = lr._seg_recover_faces(cv2, np, img, [], "face.pt", sam)
            except Exception as error:  # 串图会先炸在尺寸对不上上
                errors[name] = error

        with mock.patch.object(lr, "_seg_yolo", return_value=face):
            threads = [threading.Thread(target=worker, args=(name, shape))
                       for name, shape in self.SIZES]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()
        return results, errors, events

    def test_concurrent_recovery_returns_each_threads_own_shape(self):
        results, errors, _ = self._concurrent_runs()
        self.assertEqual(errors, {}, f"并发补漏不该抛：{errors}")
        for name, (height, width) in self.SIZES:
            self.assertEqual(len(results[name]), 1, f"{name} 应补回一块")
            self.assertEqual(results[name][0].shape, (height, width),
                             f"{name} 拿到了别人图的蒙版（尺寸 {results[name][0].shape}）")

    def test_set_image_and_predict_are_never_interleaved(self):
        _, _, events = self._concurrent_runs()
        # 三线程各一次 set + 一次 predict：加锁后必须严格交替，不出现两笔 set 挨着
        self.assertEqual(events, ["set", "predict"] * len(self.SIZES))


class PartitionCandidatesTests(unittest.TestCase):
    """大模型颜色分区图的 kmeans 提块：纯色块合成图验证排序、背景丢弃与小块过滤。"""

    def _partition_image(self, width=400, height=200):
        image = Image.new("RGB", (width, height), (5, 5, 5))  # 近黑背景
        image.paste((220, 40, 40), (30, 30, 130, 180))    # 左：红
        image.paste((40, 40, 220), (220, 30, 340, 180))   # 右：蓝
        return image

    def test_two_people_sorted_left_to_right(self):
        people = lr.partition_candidates(self._partition_image())
        self.assertEqual(len(people), 2)
        self.assertLess(people[0]["cx"], people[1]["cx"])
        for person in people:
            self.assertEqual(person["mask"].shape, (200, 400))
            self.assertEqual(len(person["box"]), 4)
            self.assertTrue(all(0 <= v <= 1 for v in person["box"]))
            self.assertGreater(person["coverage"], 0)

    def test_black_background_yields_no_candidates(self):
        people = lr.partition_candidates(Image.new("RGB", (200, 100), (0, 0, 0)))
        self.assertEqual(people, [])

    def test_tiny_color_specks_are_filtered(self):
        image = Image.new("RGB", (400, 200), (5, 5, 5))
        image.paste((220, 40, 40), (30, 30, 130, 180))
        image.paste((40, 40, 220), (390, 10, 393, 13))  # 4x3 像素小点，远低于面积线
        people = lr.partition_candidates(image)
        self.assertEqual(len(people), 1)

    def test_target_size_rescales_mask_and_box(self):
        people = lr.partition_candidates(self._partition_image(), target_size=(200, 100))
        self.assertEqual(len(people), 2)
        for person in people:
            self.assertEqual(person["mask"].shape, (100, 200))


class PartitionIndexLayerTests(unittest.TestCase):
    """分区图 → 索引层：同色分号、从左到右稳定编号、候选与层同源。"""

    def _image(self, blocks, width=400, height=200):
        image = Image.new("RGB", (width, height), (5, 5, 5))
        for color, box in blocks:
            image.paste(color, box)
        return image

    def test_same_color_two_people_get_two_indexes(self):
        image = self._image([((220, 40, 40), (20, 30, 120, 170)),
                             ((220, 40, 40), (240, 30, 340, 170))])
        result = lr.partition_index_layer(image)
        self.assertEqual([entry["index"] for entry in result["entries"]], [1, 2])
        self.assertEqual(sorted(int(v) for v in np.unique(result["layer"])), [0, 1, 2])
        self.assertLess(result["entries"][0]["cx"], result["entries"][1]["cx"])

    def test_candidates_are_materialized_from_the_layer(self):
        image = self._image([((220, 40, 40), (30, 30, 130, 180)),
                             ((40, 40, 220), (220, 30, 340, 180))])
        entries = lr.partition_index_layer(image)["entries"]
        people = lr.partition_candidates(image)
        self.assertEqual([person["box"] for person in people],
                         [entry["box"] for entry in entries])
        for person, entry in zip(people, entries):
            self.assertAlmostEqual(person["coverage"], entry["coverage"], places=6)

    def test_indexes_are_capped_and_overflow_reported(self):
        image = self._image([((220, 40, 40), (20, 30, 120, 170)),
                             ((220, 40, 40), (240, 30, 340, 170))])
        with mock.patch.object(lr, "PARTITION_MAX_IDS", 1):
            result = lr.partition_index_layer(image)
        self.assertEqual(len(result["entries"]), 1)
        self.assertEqual([item["reason"] for item in result["dropped"]], ["id_overflow"])

    def test_target_size_layer_shape_and_nearest_upscale(self):
        image = self._image([((220, 40, 40), (30, 30, 130, 180))], width=200, height=100)
        result = lr.partition_index_layer(image, target_size=(800, 400))
        self.assertEqual(result["layer"].shape, (400, 800))
        self.assertEqual(result["layer"].dtype, np.uint8)
        # 放大只用最近邻：一个身份不会在层里多出第三种号
        self.assertEqual(sorted(int(v) for v in np.unique(result["layer"])), [0, 1])


class RegionIndexVoteTests(unittest.TestCase):
    """框选区域在索引层上投票：占比够才落身份，全背景与撞车各自明说。"""

    def setUp(self):
        self.layer = np.zeros((100, 200), np.uint8)
        self.layer[10:90, 10:90] = 1
        self.layer[10:90, 110:190] = 2

    def test_clean_box_claims_one_identity_inside_the_box(self):
        result = lr.region_index_vote(self.layer, [0.05, 0.1, 0.45, 0.9])
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["index"], 1)
        self.assertAlmostEqual(result["share"], 1.0)
        self.assertEqual(result["mask"].shape, (100, 200))
        self.assertTrue((result["mask"][10:90, 10:90] == 1).all())
        # 框外的同一身份像素不算进来，裁不裁由编辑器决定
        self.assertEqual(result["mask"].sum(), 80 * 80)

    def test_box_on_background_is_empty(self):
        result = lr.region_index_vote(self.layer, [0.5, 0.95, 0.9, 1.0])
        self.assertEqual(result["status"], "empty")
        self.assertIn("大模型分出的身份", result["message"])

    def test_mixed_box_is_unreliable_instead_of_guessing(self):
        result = lr.region_index_vote(self.layer, [0.05, 0.1, 0.95, 0.9])
        self.assertEqual(result["status"], "unreliable")
        self.assertLess(result["share"], lr.REGION_MIN_SHARE)
        self.assertIn("不可靠", result["message"])

    def test_min_share_is_tunable(self):
        result = lr.region_index_vote(self.layer, [0.05, 0.1, 0.95, 0.9], min_share=0.4)
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["index"], 1)


if __name__ == "__main__":
    unittest.main()