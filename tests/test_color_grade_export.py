"""Video color-grade LUT export (FFmpeg lut3d)."""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import FormData, web
from aiohttp.test_utils import TestClient, TestServer

from server.color_grade_export import (
    ColorGradeExportApi,
    _ffmpeg_filter_path,
    _normalize_blur,
    _normalize_motion_blur,
    _normalize_sharpen,
    _normalize_vignette,
    blur_sigma,
    build_color_grade_vf,
    build_grade_args,
    motion_blur_mix_frames,
    progress_ratio,
    sharpen_matrix_size,
    write_vignette_mask,
)


class ColorGradeExportTests(unittest.IsolatedAsyncioTestCase):
    def test_ffmpeg_filter_path_escapes_drive_colon(self):
        escaped = _ffmpeg_filter_path(Path("D:/tmp/grade.cube"))
        self.assertIn("grade.cube", escaped)
        self.assertIn("\\:", escaped)

    def test_vignette_filter_appended_when_enabled(self):
        cube = Path("D:/tmp/grade.cube")
        plain = build_color_grade_vf(cube)
        self.assertTrue(plain.startswith("lut3d="))
        self.assertNotIn("geq=", plain)
        args = build_grade_args(
            Path("D:/in.mp4"), cube, Path("D:/out.part.mp4"),
            mask=Path("D:/tmp/vignette.png"), size=(1920, 1080),
        )
        graph = args[args.index("-filter_complex") + 1]
        self.assertIn("lut3d=", graph)
        self.assertIn("overlay=format=auto", graph)
        self.assertIn("1920:1080", graph)
        self.assertNotIn("geq", graph)

    def test_progress_ratio_uses_out_time(self):
        self.assertIsNone(progress_ratio("out_time=00:00:01.000000", 0))
        self.assertAlmostEqual(progress_ratio("out_time=00:00:01.000000", 4), 0.25)
        self.assertEqual(progress_ratio("progress=end", 4), 1.0)

    def test_vignette_mask_is_clear_at_center(self):
        vig = _normalize_vignette({
            "enabled": True,
            "size": 0.5,
            "anamorphism": 1.0,
            "softness": 0.5,
            "opacity": 1.0,
            "color": "#000000",
        })
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "vignette.png"
            write_vignette_mask(path, 160, 90, vig)
            from PIL import Image
            image = Image.open(path)
            self.assertEqual(image.getpixel((image.width // 2, image.height // 2))[3], 0)
            self.assertGreater(image.getpixel((0, 0))[3], 200)

    def test_vignette_opacity_scales_mask_alpha(self):
        vig = _normalize_vignette({
            "enabled": True,
            "size": 0.5,
            "anamorphism": 1.0,
            "softness": 0.5,
            "opacity": 0.5,
            "color": "#000000",
        })
        self.assertAlmostEqual(vig["opacity"], 0.5)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "vignette.png"
            write_vignette_mask(path, 160, 90, vig)
            from PIL import Image
            image = Image.open(path)
            corner = image.getpixel((0, 0))[3]
            self.assertGreater(corner, 90)
            self.assertLess(corner, 160)
        self.assertIsNone(_normalize_vignette({"enabled": True, "opacity": 0}))

    def test_vignette_ignored_when_disabled(self):
        self.assertIsNone(_normalize_vignette({"enabled": False, "size": 0.2}))
        self.assertIsNone(_normalize_vignette("nope"))

    def test_motion_blur_tmix_follows_openfilm_shutter_window(self):
        self.assertIsNone(motion_blur_mix_frames(8, 0))
        self.assertEqual(motion_blur_mix_frames(8, 0.5), 5)
        self.assertEqual(motion_blur_mix_frames(8, 1), 8)
        blur = _normalize_motion_blur(
            {"enabled": True, "samples": 8, "shutter": 0.5}
        )
        args = build_grade_args(
            Path("D:/in.mp4"), Path("D:/tmp/grade.cube"), Path("D:/out.part.mp4"),
            motion_blur=blur,
        )
        vf = args[args.index("-vf") + 1]
        self.assertIn("lut3d=", vf)
        self.assertIn("tmix=frames=5", vf)
        self.assertIsNone(_normalize_motion_blur({"enabled": False, "samples": 8}))

    def test_sharpen_unsharp_after_lut3d(self):
        self.assertEqual(sharpen_matrix_size(0.5), 3)
        self.assertEqual(sharpen_matrix_size(1), 5)
        self.assertEqual(sharpen_matrix_size(5), 21)
        self.assertEqual(sharpen_matrix_size(10), 23)
        self.assertIsNone(_normalize_sharpen({"enabled": False, "amount": 1}))
        self.assertIsNone(_normalize_sharpen({"enabled": True, "amount": 0}))
        sharp = _normalize_sharpen(
            {"enabled": True, "amount": 1.25, "radius": 1}
        )
        self.assertEqual(sharp["matrix"], 5)
        args = build_grade_args(
            Path("D:/in.mp4"), Path("D:/tmp/grade.cube"), Path("D:/out.part.mp4"),
            sharpen=sharp,
        )
        vf = args[args.index("-vf") + 1]
        self.assertIn("lut3d=", vf)
        self.assertIn("unsharp=5:5:1.25:3:3:0", vf)
        with_mask = build_grade_args(
            Path("D:/in.mp4"), Path("D:/tmp/grade.cube"), Path("D:/out.part.mp4"),
            mask=Path("D:/tmp/vignette.png"), size=(1920, 1080),
            sharpen=sharp,
        )
        graph = with_mask[with_mask.index("-filter_complex") + 1]
        self.assertIn("lut3d=", graph)
        self.assertIn("unsharp=5:5:1.25:3:3:0", graph)
        self.assertLess(graph.index("unsharp="), graph.index("overlay="))

    def test_blur_gblur_after_unsharp(self):
        self.assertAlmostEqual(blur_sigma(0.5, 4), 2.0)
        self.assertIsNone(_normalize_blur({"enabled": False, "amount": 1}))
        self.assertIsNone(_normalize_blur({"enabled": True, "amount": 0}))
        soft = _normalize_blur({"enabled": True, "amount": 0.5, "radius": 4})
        self.assertAlmostEqual(soft["sigma"], 2.0)
        args = build_grade_args(
            Path("D:/in.mp4"), Path("D:/tmp/grade.cube"), Path("D:/out.part.mp4"),
            blur=soft,
        )
        vf = args[args.index("-vf") + 1]
        self.assertIn("lut3d=", vf)
        self.assertIn("gblur=sigma=2", vf)
        sharp = _normalize_sharpen({"enabled": True, "amount": 1, "radius": 1})
        both = build_grade_args(
            Path("D:/in.mp4"), Path("D:/tmp/grade.cube"), Path("D:/out.part.mp4"),
            sharpen=sharp, blur=soft,
        )
        vf_both = both[both.index("-vf") + 1]
        self.assertLess(vf_both.index("unsharp="), vf_both.index("gblur="))

    async def test_apply_runs_ffmpeg_and_returns_video_asset(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            uploads = root / "data" / "uploads"
            uploads.mkdir(parents=True)
            source = uploads / "source.mp4"
            source.write_bytes(b"fake-video")
            cube = (
                'TITLE "t"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n'
                "0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n"
            ).encode()

            async def require_project(request, project_id, operate=False):
                return None

            async def require_resource(request, *ref, project_id=None):
                return None

            async def resource_call(app, action, *args, **kwargs):
                if action == "reference":
                    return ("upload", "source.mp4")
                if action == "local_path":
                    return source
                if action == "register":
                    return {"resource_id": 1}
                if action == "publish":
                    return None
                raise AssertionError(action)

            ffmpeg = root / "ffmpeg.exe"
            ffmpeg.write_bytes(b"")

            async def fake_probe(exe, source):
                return 160, 90, 2.0

            async def fake_run(exe, args, duration=0.0, on_progress=None):
                self.assertEqual(args[-2], "mp4")
                self.assertTrue(str(args[-1]).endswith(".part.mp4"), args[-1])
                graph = args[args.index("-filter_complex") + 1]
                self.assertIn("lut3d=", graph)
                self.assertIn("overlay=format=auto", graph)
                self.assertNotIn("geq", graph)
                self.assertEqual(duration, 2.0)
                if on_progress:
                    await on_progress(0.5)
                Path(args[-1]).write_bytes(b"graded")

            api = ColorGradeExportApi(
                {},
                root=root,
                ffmpeg_bin=lambda: ffmpeg,
                require_project=require_project,
                require_resource=require_resource,
                resource_call=resource_call,
                kind_of=lambda name: "video",
                vid_ext={".mp4"},
            )
            app = web.Application()
            app.router.add_post("/api/color-grade/video", api.apply)
            with mock.patch("server.color_grade_export._probe_media", side_effect=fake_probe), \
                    mock.patch("server.color_grade_export._run_ffmpeg", side_effect=fake_run):
                async with TestClient(TestServer(app)) as client:
                    form = FormData()
                    form.add_field("project", "p")
                    form.add_field("video_url", "/api/upload/source.mp4")
                    form.add_field(
                        "cube", cube, filename="grade.cube", content_type="text/plain",
                    )
                    form.add_field(
                        "vignette",
                        '{"enabled":true,"size":0.5,"anamorphism":1.0,"softness":0.4,"color":"#000000"}',
                    )
                    response = await client.post("/api/color-grade/video", data=form)
                    body = await response.text()
                    self.assertEqual(response.status, 200, body)
                    events = [json.loads(line) for line in body.splitlines() if line.strip()]
                    self.assertTrue(any(item.get("type") == "progress" for item in events))
                    payload = events[-1]
                    self.assertEqual(payload["type"], "done")
                    self.assertEqual(payload["kind"], "video")
                    self.assertTrue(payload["url"].startswith("/api/upload/grade_"))
                    self.assertTrue(
                        (root / "data" / "uploads" / Path(payload["url"]).name).is_file()
                    )

    async def test_apply_passes_blur_gblur_into_ffmpeg_vf(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            uploads = root / "data" / "uploads"
            uploads.mkdir(parents=True)
            source = uploads / "source.mp4"
            source.write_bytes(b"fake-video")
            cube = (
                'TITLE "t"\nLUT_3D_SIZE 2\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n'
                "0 0 0\n1 0 0\n0 1 0\n1 1 0\n0 0 1\n1 0 1\n0 1 1\n1 1 1\n"
            ).encode()
            seen = {}

            async def require_project(request, project_id, operate=False):
                return None

            async def require_resource(request, *ref, project_id=None):
                return None

            async def resource_call(app, action, *args, **kwargs):
                if action == "reference":
                    return ("upload", "source.mp4")
                if action == "local_path":
                    return source
                if action == "register":
                    return {"resource_id": 1}
                if action == "publish":
                    return None
                raise AssertionError(action)

            ffmpeg = root / "ffmpeg.exe"
            ffmpeg.write_bytes(b"")

            async def fake_probe(exe, source):
                return 160, 90, 1.0

            async def fake_run(exe, args, duration=0.0, on_progress=None):
                seen["vf"] = args[args.index("-vf") + 1]
                Path(args[-1]).write_bytes(b"graded")

            api = ColorGradeExportApi(
                {},
                root=root,
                ffmpeg_bin=lambda: ffmpeg,
                require_project=require_project,
                require_resource=require_resource,
                resource_call=resource_call,
                kind_of=lambda name: "video",
                vid_ext={".mp4"},
            )
            app = web.Application()
            app.router.add_post("/api/color-grade/video", api.apply)
            with mock.patch("server.color_grade_export._probe_media", side_effect=fake_probe), \
                    mock.patch("server.color_grade_export._run_ffmpeg", side_effect=fake_run):
                async with TestClient(TestServer(app)) as client:
                    form = FormData()
                    form.add_field("project", "p")
                    form.add_field("video_url", "/api/upload/source.mp4")
                    form.add_field(
                        "cube", cube, filename="grade.cube", content_type="text/plain",
                    )
                    form.add_field(
                        "blur",
                        '{"enabled":true,"amount":0.5,"radius":4}',
                    )
                    response = await client.post("/api/color-grade/video", data=form)
                    body = await response.text()
                    self.assertEqual(response.status, 200, body)
                    self.assertIn("gblur=sigma=2", seen["vf"])
                    self.assertIn("lut3d=", seen["vf"])


if __name__ == "__main__":
    unittest.main()
