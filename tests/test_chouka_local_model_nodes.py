"""ChouKa 本地模型节点包的离线单测：口径对齐、图与节点签名对得上、产物能无损往返。

不启动 ComfyUI、不加载权重、不调任何付费接口。folder_paths 用临时目录假件顶掉，
torch/numpy/cv2 缺失时相关用例整体跳过（那是环境问题，不算回归）。
"""
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import types
import unittest
from unittest import mock

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "server"))

try:
    import cv2  # noqa: F401
    import numpy as np
    from PIL import Image
    import torch
except Exception:  # pragma: no cover - 依赖缺失时跳过
    raise unittest.SkipTest("节点包单测需要 numpy/cv2/torch/Pillow")

# folder_paths 假件：只实现节点包用到的四个入口，目录指向临时区，绝不碰真机 ComfyUI。
_TMP = Path(tempfile.mkdtemp(prefix="chouka-node-test-"))
_FAKE_COMFY = _TMP / "ComfyUI"
_OUTPUT = _FAKE_COMFY / "output"
(_FAKE_COMFY / "models").mkdir(parents=True)
_OUTPUT.mkdir(parents=True)

folder_paths = types.ModuleType("folder_paths")
folder_paths.base_path = str(_FAKE_COMFY)
folder_paths.get_output_directory = lambda: str(_OUTPUT)


def _get_folder_paths(category):
    raise KeyError(category)


def _get_save_image_path(filename_prefix, output_dir, width=0, height=0):
    subfolder = os.path.dirname(filename_prefix.replace("\\", "/"))
    stem = os.path.basename(filename_prefix)
    folder = Path(output_dir) / subfolder
    folder.mkdir(parents=True, exist_ok=True)
    return str(folder), stem, 1, subfolder, stem


folder_paths.get_folder_paths = _get_folder_paths
folder_paths.get_save_image_path = _get_save_image_path
sys.modules["folder_paths"] = folder_paths

import importlib.util

PKG_DIR = ROOT / "comfyui_nodes" / "chouka_local_models"
_spec = importlib.util.spec_from_file_location(
    "chouka_local_models", PKG_DIR / "__init__.py",
    submodule_search_locations=[str(PKG_DIR)])
package = importlib.util.module_from_spec(_spec)
sys.modules["chouka_local_models"] = package
_spec.loader.exec_module(package)

from chouka_local_models import chouka_rules as rules  # noqa: E402
from server import local_relight  # noqa: E402

GRAPH = json.loads((ROOT / "graphs" / "seg_persons.api.json").read_text(encoding="utf-8"))
MANUAL_GRAPH = json.loads((ROOT / "graphs" / "seg_manual.api.json").read_text(encoding="utf-8"))
# 两条图都要过签名对账：节点改了输入名、图没跟着改，是提交期才炸的错。
GRAPHS = {"seg_persons": GRAPH, "seg_manual": MANUAL_GRAPH}


def blob_alpha(rgb):
    """中间一块前景、四周一圈背景：GrabCut 的前景/背景样本都有，兜底分支不会误触发。"""
    height, width = rgb.shape[:2]
    ys, xs = np.mgrid[0:height, 0:width]
    dist = np.sqrt((xs - width * 0.5) ** 2 + (ys - height * 0.5) ** 2)
    blob = 1.15 - dist / max(1.0, min(width, height) * 0.34)
    shade = np.asarray(rgb, np.float32).mean(axis=2) / 255.0
    return np.clip(blob + (shade - 0.5) * 0.2, 0.0, 1.0)


def solid_alpha(rgb):
    return np.ones(rgb.shape[:2], np.float32)


def fake_rembg(alpha_fn=blob_alpha):
    """假 rembg：不做真推理，只按像素给一个两边共用的确定 alpha。"""
    module = types.ModuleType("rembg")
    module.new_session = lambda *args, **kwargs: object()

    def remove(image, *args, **kwargs):
        rgb = np.asarray(image.convert("RGB"))
        bands = [Image.fromarray(rgb[..., i]) for i in range(3)]
        bands.append(Image.fromarray((alpha_fn(rgb) * 255.0).astype("uint8")))
        return Image.merge("RGBA", bands)

    module.remove = remove
    return module


def as_tensor(mask):
    return torch.from_numpy(np.asarray(mask, np.float32))


class PackageTests(unittest.TestCase):
    def test_ten_capabilities_registered(self):
        self.assertEqual(set(package.NODE_CLASS_MAPPINGS), {
            "ChoukaPersonSeg", "ChoukaFaceSeg", "ChoukaSamPrompt", "ChoukaSegMerge",
            "ChoukaSaveIdentityLayer", "ChoukaU2netMask", "ChoukaSaveMask",
            "ChoukaRtmwPose", "ChoukaRtmw3dPose", "ChoukaSaveJson"})
        self.assertEqual(set(package.NODE_DISPLAY_NAME_MAPPINGS),
                         set(package.NODE_CLASS_MAPPINGS))

    def test_every_class_declares_contract(self):
        for name, cls in package.NODE_CLASS_MAPPINGS.items():
            with self.subTest(node=name):
                self.assertTrue(callable(cls.INPUT_TYPES))
                self.assertTrue(cls.FUNCTION)
                self.assertEqual(len(cls.RETURN_TYPES), len(cls.RETURN_NAMES), name)
                self.assertTrue(cls.CATEGORY.startswith("chouka/"), name)


class GraphSignatureTests(unittest.TestCase):
    """seg_persons 图的每个输入名、每条连线都要对得上节点签名：漂移要在提交期之前就发现。"""

    def outputs_of(self, cls):
        return len(cls.RETURN_TYPES)

    def test_nodes_and_inputs_match_signatures(self):
        for graph_name, graph in GRAPHS.items():
            for node_id, node in graph.items():
                cls = package.NODE_CLASS_MAPPINGS.get(node["class_type"])
                if cls is None:
                    # 标准节点（LoadImage 等）由 ComfyUI 本体提供，签名不在这个包里，这里不校验。
                    continue
                spec = cls.INPUT_TYPES()
                allowed = set(spec.get("required") or {}) | set(spec.get("optional") or {})
                for input_name in node.get("inputs") or {}:
                    with self.subTest(graph=graph_name, node=node_id, inp=input_name):
                        self.assertIn(input_name, allowed)

    def test_links_point_at_existing_nodes(self):
        for graph_name, graph in GRAPHS.items():
            for node_id, node in graph.items():
                for input_name, value in (node.get("inputs") or {}).items():
                    if isinstance(value, list) and len(value) == 2 and isinstance(value[0], str):
                        with self.subTest(graph=graph_name, node=node_id, inp=input_name):
                            self.assertIn(value[0], graph)
                            cls = package.NODE_CLASS_MAPPINGS.get(graph[value[0]]["class_type"])
                            if cls is not None:
                                self.assertLess(value[1], self.outputs_of(cls))

    def test_model_names_are_the_ones_preset_in_m0(self):
        """图里写的权重名必须就是预置清单里那几份，名字对不上运行期才炸。"""
        from chouka_local_models import chouka_models as models

        self.assertEqual(GRAPH["2"]["inputs"]["model_name"], models.PERSON_MODEL_DEFAULT)
        self.assertEqual(GRAPH["3"]["inputs"]["model_name"], models.FACE_MODEL_DEFAULT)
        self.assertEqual(GRAPH["4"]["inputs"]["sam_model"], models.SAM_MODEL_DEFAULT)
        self.assertEqual(GRAPH["4"]["inputs"]["sam_config"], local_relight.SEG_SAM2_CONFIG)

    def test_production_knobs_are_pinned(self):
        """生产档三个数字要和 local_relight 常量一致：改了任何一边都要在这里先红。"""
        self.assertEqual(GRAPH["2"]["inputs"]["imgsz"], local_relight.SEG_IMGSZ)
        self.assertEqual(GRAPH["2"]["inputs"]["conf"], local_relight.SEG_CONF)
        self.assertEqual(GRAPH["2"]["inputs"]["min_area_ratio"],
                         local_relight.MIN_PERSON_AREA_RATIO)

    def test_manual_graph_wires_mask_and_box_artifacts(self):
        """补块图：默认用人像权重，一头出软蒙版、一头出包围盒，产物名要和服务端取物前缀对得上。"""
        from chouka_local_models import chouka_models as models

        self.assertEqual(MANUAL_GRAPH["2"]["inputs"]["mode"], "point")
        self.assertEqual(MANUAL_GRAPH["2"]["inputs"]["model_name"],
                         models.U2NET_HUMAN_MODEL_DEFAULT)
        self.assertEqual(MANUAL_GRAPH["3"]["inputs"]["filename_prefix"], "chouka/ckmask")
        self.assertEqual(MANUAL_GRAPH["4"]["inputs"]["filename_prefix"], "chouka/ckmaskbox")

    def test_server_picks_the_same_two_weights(self):
        """服务端点框选各用哪档权重，必须就是节点下拉里有的那两个文件名。"""
        from server import cloud_lighting
        from chouka_local_models import chouka_models as models

        self.assertEqual(cloud_lighting.MANUAL_MODELS["point"], models.U2NET_HUMAN_MODEL_DEFAULT)
        self.assertEqual(cloud_lighting.MANUAL_MODELS["box"], models.U2NET_MODEL_DEFAULT)


class RulesParityTests(unittest.TestCase):
    """节点侧规则与服务端进程内链逐条对齐：同一张图两边必须得到同一串候选人。"""

    def random_masks(self, seed=7, count=4):
        rng = np.random.default_rng(seed)
        masks = []
        for _ in range(count):
            blob = (rng.random((96, 128)) > 0.55).astype("uint8")
            masks.append(blob)
        return masks

    def test_fill_and_close_matches_server_postfix(self):
        for mask in self.random_masks():
            node_side = rules.fill_and_close(mask.astype("float32"))
            server_side = local_relight._seg_postfix(cv2, np, mask.astype("float32"))
            self.assertTrue((node_side == server_side).all())

    def test_index_layer_roundtrips_through_server_decoder(self):
        """节点写的 L 模式 PNG，服务端解码回来的身份号一个都不能变。"""
        ordered = rules.order_by_centroid_x(self.random_masks())
        layer, dropped = rules.build_index_layer(ordered, ordered[0].shape)
        self.assertEqual(dropped, 0)
        buffer = __import__("io").BytesIO()
        Image.fromarray(layer, mode="L").save(buffer, format="PNG")
        decoded = local_relight.decode_identity_layer(buffer.getvalue(),
                                                      (layer.shape[1], layer.shape[0]))
        self.assertTrue((decoded == layer).all())

    def test_index_layer_entries_agree_with_server_box_formula(self):
        ordered = rules.order_by_centroid_x(self.random_masks(seed=11))
        layer, _dropped = rules.build_index_layer(ordered, ordered[0].shape)
        height, width = layer.shape
        for entry in rules.index_layer_entries(layer):
            server_box = entry["box"]
            column = (layer == entry["index"])
            ys, xs = np.nonzero(column)
            self.assertAlmostEqual(server_box[0], xs.min() / width, places=6)
            self.assertAlmostEqual(server_box[2], (xs.max() + 1) / width, places=6)
            self.assertAlmostEqual(entry["coverage"], len(xs) / (width * height), places=6)

    def test_index_layer_overflow_is_reported_not_silently_truncated(self):
        masks = [np.zeros((8, 8), np.uint8) for _ in range(257)]
        layer, dropped = rules.build_index_layer(masks, (8, 8))
        self.assertEqual(dropped, 2)
        self.assertLessEqual(int(layer.max()), 255)

    def test_box_mask_roundtrip(self):
        box = [10, 20, 40, 70]
        mask = rules.box_to_mask(box, (100, 100))
        self.assertEqual(rules.mask_to_box(mask), box)
        self.assertIsNone(rules.mask_to_box(np.zeros((8, 8), np.uint8)))


class ManualCutoutParityTests(unittest.TestCase):
    """手工补块：节点侧规则与服务端 segment_point / segment_box 逐像素对齐。

    rembg 换成一个只看像素的确定函数（两边共用同一个），剩下的差异只可能来自
    GrabCut 播种、连通域筛选、沿列延伸、1.2 羽化这几段口径本身——复制过去最容易走样的正是这几段。
    """

    def alpha_of(self, rgb, alpha_fn=blob_alpha):
        """节点里那一套：PIL 进、float32 alpha 出，与 nodes_cutout 的 alpha_of 同形。"""
        pil = Image.fromarray(rgb)
        cut = fake_rembg(alpha_fn).remove(pil).split()[-1].resize(pil.size, Image.BILINEAR)
        return np.asarray(cut).astype("float32") / 255.0

    def picture(self, width=160, height=120, seed=3):
        rng = np.random.default_rng(seed)
        return (rng.random((height, width, 3)) * 255).astype("uint8")

    def server_side(self, func, rgb, prompt):
        with mock.patch.dict(sys.modules, {"rembg": fake_rembg()}):
            return func(Image.fromarray(rgb), prompt)

    def test_point_rules_match_server_constants(self):
        self.assertEqual(rules.POINT_WINDOW, local_relight.POINT_WINDOW)
        self.assertEqual(rules.FEATHER_SIGMA, 1.2)

    def test_point_matches_inprocess_chain_pixel_for_pixel(self):
        rgb = self.picture()
        point = [0.42, 0.38]
        server = self.server_side(local_relight.segment_point, rgb, point)
        node = rules.point_mask(rgb, self.alpha_of, point)
        self.assertEqual(node["box"], server["box"])
        self.assertEqual(node["coverage"], server["coverage"])
        self.assertTrue((node["mask"] == server["mask"]).all())
        # 沿列延伸要真的生效：不延伸时下边界停在裁窗底 79/120=0.658，延伸到全身要越过这个数
        self.assertGreater(node["box"][3], 0.66)

    def test_box_matches_inprocess_chain_pixel_for_pixel(self):
        rgb = self.picture()
        box = [0.2, 0.15, 0.75, 0.9]
        server = self.server_side(local_relight.segment_box, rgb, box)
        node = rules.box_mask(rgb, self.alpha_of, box)
        self.assertEqual(node["box"], server["box"])
        self.assertEqual(node["coverage"], server["coverage"])
        self.assertTrue((node["mask"] == server["mask"]).all())

    def test_all_foreground_box_takes_the_same_fallback(self):
        """框内全是前景时 GrabCut 没有背景样本，两边都走 alpha>0.5 兜底而不是各自崩。"""
        rgb = np.full((60, 80, 3), 255, np.uint8)
        box = [0.1, 0.1, 0.9, 0.9]
        with mock.patch.dict(sys.modules, {"rembg": fake_rembg(solid_alpha)}):
            server = local_relight.segment_box(Image.fromarray(rgb), box)
        node = rules.box_mask(rgb, lambda crop: self.alpha_of(crop, solid_alpha), box)
        self.assertEqual(node["coverage"], server["coverage"])
        self.assertTrue((node["mask"] == server["mask"]).all())
        self.assertGreater(node["coverage"], 0)


class ChoukaU2netMaskNodeTests(unittest.TestCase):
    """节点入口的硬约束：像素不暗一档、坏提示与缺权重当场说清楚、整条入口结果同进程内链。"""

    def setUp(self):
        from chouka_local_models import chouka_models as models

        models._CACHE.pop("cutout:u2net_human_seg.onnx", None)
        models._CACHE.pop("cutout:u2net_human_seg.onnx:error", None)

    def tearDown(self):
        self.setUp()

    def tensor(self, rgb):
        return torch.from_numpy(rgb.astype("float32") / 255.0)[None, ...]

    def random_rgb(self, height=48, width=64, seed=5):
        rng = np.random.default_rng(seed)
        return (rng.random((height, width, 3)) * 255).astype("uint8")

    def big_rgb(self, width=160, height=120, seed=9):
        rng = np.random.default_rng(seed)
        return (rng.random((height, width, 3)) * 255).astype("uint8")

    def test_tensor_to_rgb_does_not_lose_one_level(self):
        """IMAGE 张量换回 uint8 要逐位相同：截断取整会让整图暗 1 个色阶，GrabCut 颜色模型跟着变。"""
        from chouka_local_models import nodes_cutout

        rgb = self.random_rgb()
        self.assertTrue((nodes_cutout._image_to_rgb(self.tensor(rgb)) == rgb).all())

    def test_bad_prompt_json_is_refused(self):
        with self.assertRaisesRegex(ValueError, "不是合法 JSON"):
            package.ChoukaU2netMask().segment(self.tensor(self.random_rgb()), "point",
                                              "u2net_human_seg.onnx", "{不是 JSON")

    def test_missing_weights_say_why(self):
        """假 folder_paths 把权重目录指到临时区 ⇒ 这里必然「不在位」，要抛错而不是出空蒙版。"""
        with self.assertRaisesRegex(ValueError, "权重不可用"):
            package.ChoukaU2netMask().segment(self.tensor(self.random_rgb()), "point",
                                              "u2net_human_seg.onnx", '{"point": [0.5, 0.5]}')

    def test_point_without_prompt_is_refused(self):
        """有会话但提示不合法：也算作业失败，回一张空蒙版会让出图「看起来成功但没照着块打光」。"""
        from chouka_local_models import chouka_models as models

        models._CACHE["cutout:u2net_human_seg.onnx"] = object()
        with mock.patch.dict(sys.modules, {"rembg": fake_rembg()}):
            with self.assertRaisesRegex(ValueError, "缺 point"):
                package.ChoukaU2netMask().segment(self.tensor(self.random_rgb()), "point",
                                                  "u2net_human_seg.onnx", "{}")

    def test_node_runs_the_same_rules_as_the_server_chain(self):
        """走完整节点入口（含张量换算）出的蒙版，要和服务端进程内链同一份结果。"""
        from chouka_local_models import chouka_models as models

        rgb = self.big_rgb()
        point = [0.42, 0.38]
        models._CACHE["cutout:u2net_human_seg.onnx"] = object()
        with mock.patch.dict(sys.modules, {"rembg": fake_rembg()}):
            mask, coverage, meta, _note = package.ChoukaU2netMask().segment(
                self.tensor(rgb), "point", "u2net_human_seg.onnx",
                json.dumps({"point": point}))
        with mock.patch.dict(sys.modules, {"rembg": fake_rembg()}):
            server = local_relight.segment_point(Image.fromarray(rgb), point)
        # 包围盒过一遍 JSON，只剩 6 位小数（归一化坐标，等效亚像素）；蒙版本身必须逐位相同
        self.assertEqual(json.loads(meta)["box"], [round(float(v), 6) for v in server["box"]])
        self.assertEqual(json.loads(meta)["coverage"], round(float(server["coverage"]), 8))
        self.assertEqual(coverage, server["coverage"])
        self.assertTrue((mask[0].numpy() == server["mask"]).all())


class SaveMaskNodeTests(unittest.TestCase):
    """软蒙版落盘：16 位无损，服务端解码回来逐位可用；8 位或改尺寸一律拒收。"""

    def setUp(self):
        for path in _OUTPUT.glob("*"):
            shutil.rmtree(path) if path.is_dir() else path.unlink()

    def ramp(self, width=60, height=40):
        row = np.linspace(0.0, 1.0, width, dtype="float32")
        return np.tile(row, (height, 1))

    def test_soft_gradient_survives_the_roundtrip(self):
        ramp = self.ramp()
        result = package.ChoukaSaveMask().save(torch.from_numpy(ramp)[None, ...],
                                               filename_prefix="chouka/ckmask")
        entry = result["ui"]["images"][0]
        self.assertEqual(entry["subfolder"], "chouka")
        data = (_OUTPUT / entry["subfolder"] / entry["filename"]).read_bytes()
        decoded = local_relight.decode_soft_mask(data, (ramp.shape[1], ramp.shape[0]))
        self.assertEqual(decoded.shape, ramp.shape)
        # 16 位量化误差上限 1/65535；换成 8 位会放大到 1/255，羽化就被削成台阶
        self.assertLessEqual(float(np.abs(decoded - ramp).max()), 1.0 / 65535.0)

    def test_empty_mask_returns_lists(self):
        result = package.ChoukaSaveMask().save(torch.zeros((0, 1, 1), dtype=torch.float32))
        self.assertEqual(result["ui"], {"images": []})
        self.assertEqual(result["result"], ("",))

    def test_eight_bit_mask_is_rejected(self):
        buffer = io.BytesIO()
        Image.fromarray(np.full((8, 8), 200, np.uint8), mode="L").save(buffer, format="PNG")
        with self.assertRaisesRegex(local_relight.MaskSizeMismatch, "16 位"):
            local_relight.decode_soft_mask(buffer.getvalue(), (8, 8))

    def test_size_mismatch_is_rejected_not_stretched(self):
        ramp = self.ramp()
        buffer = io.BytesIO()
        Image.fromarray((ramp * 65535).astype(np.uint16)).save(buffer, format="PNG")
        with self.assertRaisesRegex(local_relight.MaskSizeMismatch, "不符"):
            local_relight.decode_soft_mask(buffer.getvalue(), (ramp.shape[1] + 1, ramp.shape[0]))


class SaveJsonNodeTests(unittest.TestCase):
    """文本产物节点：合法 JSON 落 .json、非法落 .txt，history 里必须有 filename。"""

    def setUp(self):
        for path in _OUTPUT.glob("*"):
            shutil.rmtree(path) if path.is_dir() else path.unlink()

    def test_valid_json_lands_as_json_file_and_registers_output(self):
        payload = {"count": 2, "entries": [{"index": 1, "box": [0, 0, 1, 1]}]}
        result = package.ChoukaSaveJson().save(json.dumps(payload),
                                               filename_prefix="chouka/pose")
        files = result["ui"]["files"]
        self.assertEqual(len(files), 1)
        self.assertTrue(files[0]["filename"].endswith("_json.json"), files[0]["filename"])
        written = _OUTPUT / "chouka" / files[0]["filename"]
        self.assertEqual(json.loads(written.read_text(encoding="utf-8")), payload)
        self.assertEqual(result["result"][0], len(json.dumps(payload).encode("utf-8")))

    def test_non_json_falls_back_to_txt_without_losing_bytes(self):
        result = package.ChoukaSaveJson().save("补漏说明：这张图没有漏检",
                                              filename_prefix="chouka/note")
        name = result["ui"]["files"][0]["filename"]
        self.assertTrue(name.endswith("_txt.txt"), name)
        text = (_OUTPUT / "chouka" / name).read_text(encoding="utf-8")
        self.assertEqual(text, "补漏说明：这张图没有漏检")

    def test_server_classifies_json_as_file_kind(self):
        """回传通道的归类：.json 必须落到 kind=file，非媒体结果才收得回来。"""
        from server.app import kind_of

        self.assertEqual(kind_of("pose_00001_json.json"), "file")
        self.assertEqual(kind_of("note_00001_txt.txt"), "file")
        self.assertEqual(kind_of("segidx_00001_.png"), "image")


class SaveIdentityLayerTests(unittest.TestCase):
    def test_empty_masks_do_not_break_ui(self):
        """ui 的每一项都会被 ComfyUI 逐个展开，空结果也必须给列表而不是计数整数。"""
        result = package.ChoukaSaveIdentityLayer().save(torch.zeros((0, 1, 1), dtype=torch.float32))
        self.assertEqual(result["ui"], {"images": []})
        self.assertEqual(result["result"][0], 0)

    def test_layer_written_is_lossless_single_channel(self):
        masks = [np.zeros((64, 96), np.uint8), np.zeros((64, 96), np.uint8)]
        masks[0][8:40, 8:40] = 1
        masks[1][20:60, 50:90] = 1
        stacked = torch.from_numpy(np.stack(masks).astype(np.float32))
        result = package.ChoukaSaveIdentityLayer().save(stacked, filename_prefix="chouka/segidx")
        name = result["ui"]["images"][0]["filename"]
        image = Image.open(_OUTPUT / "chouka" / name)
        self.assertEqual(image.mode, "L")
        layer = np.asarray(image)
        self.assertEqual(sorted(set(np.unique(layer).tolist())), [0, 1, 2])


class SegMergeSizeGuardTests(unittest.TestCase):
    def test_mismatched_mask_is_refused_not_stretched(self):
        masks = torch.from_numpy(np.ones((1, 60, 90), np.float32))
        image = torch.zeros((1, 64, 96, 3), dtype=torch.float32)
        with self.assertRaises(ValueError):
            package.ChoukaSegMerge().merge(masks, image=image)

    def test_ordered_ids_follow_centroid_left_to_right(self):
        right = np.zeros((64, 96), np.uint8)
        right[:, 60:] = 1
        left = np.zeros((64, 96), np.uint8)
        left[:, :30] = 1
        masks = torch.from_numpy(np.stack([right, left]).astype(np.float32))
        ordered, count, _dropped, entries = package.ChoukaSegMerge().merge(masks)
        self.assertEqual(count, 2)
        first = ordered[0].numpy() > 0.5
        self.assertTrue(first[:, :30].all() and not first[:, 60:].any())
        self.assertEqual(json.loads(entries)["entries"][0]["index"], 1)


class PerceptionBlockTests(unittest.TestCase):
    """集群预检（Spec §5.4）：无合格节点要当场给出人话原因，不能静默排队。"""

    def worker(self, *, state="idle", classes=None, models_ok=True):
        capabilities = {"hardware": {"os": {"name": "Windows"}},
                        "node_classes": sorted(classes or set()),
                        "devices": [{"name": "RTX 4090", "type": "cuda",
                                     "memory_total": 24 * 1024 ** 3}],
                        "input_choices": {}, "input_types": {}}
        if not models_ok:
            capabilities["input_choices"] = None
        return {"id": "w1", "name": "node-1", "state": state, "capabilities": capabilities}

    def graph(self):
        return {"1": {"class_type": "LoadImage", "inputs": {"image": "a.png"}},
                "2": {"class_type": "ChoukaPersonSeg", "inputs": {"image": ["1", 0]}}}

    def app(self, workers):
        class Store:
            def list_generation_workers(self, *, worker_id=None):
                return workers

        return {"distributed": Store()}

    def test_single_machine_passes_through(self):
        from server.cloud_lighting import perception_block

        self.assertIsNone(perception_block({}, self.graph()))

    def test_no_visible_worker_says_so(self):
        from server.cloud_lighting import perception_block

        reason = perception_block(self.app([]), self.graph(), team_ids=None)
        self.assertIn("执行端", reason)

    def test_missing_node_class_is_reported(self):
        from server.cloud_lighting import perception_block

        reason = perception_block(self.app([self.worker(classes={"LoadImage"})]), self.graph())
        self.assertIn("缺少此能力所需节点", reason)

    def test_qualified_worker_passes(self):
        from server.cloud_lighting import perception_block

        self.assertIsNone(perception_block(
            self.app([self.worker(classes={"LoadImage", "ChoukaPersonSeg"})]), self.graph()))

    def test_worker_without_capability_report_does_not_crash_the_check(self):
        from server.cloud_lighting import perception_block

        worker = self.worker()
        worker["capabilities"] = None
        reason = perception_block(self.app([worker]), self.graph())
        self.assertIn("能力清单", reason)


if __name__ == "__main__":
    unittest.main()
