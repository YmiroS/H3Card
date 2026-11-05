"""Video color-grade LUT export (FFmpeg lut3d)."""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from aiohttp import FormData, web
from aiohttp.test_utils import TestClient, TestServer

from server.color_grade_export import ColorGradeExportApi, _ffmpeg_filter_path


class ColorGradeExportTests(unittest.IsolatedAsyncioTestCase):
    def test_ffmpeg_filter_path_escapes_drive_colon(self):
        escaped = _ffmpeg_filter_path(Path("D:/tmp/grade.cube"))
        self.assertIn("grade.cube", escaped)
        self.assertIn("\\:", escaped)

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

            async def fake_run(exe, args):
                self.assertEqual(args[-2], "mp4")
                self.assertTrue(str(args[-1]).endswith(".part.mp4"), args[-1])
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
            with mock.patch("server.color_grade_export._run_ffmpeg", side_effect=fake_run):
                async with TestClient(TestServer(app)) as client:
                    form = FormData()
                    form.add_field("project", "p")
                    form.add_field("video_url", "/api/upload/source.mp4")
                    form.add_field(
                        "cube", cube, filename="grade.cube", content_type="text/plain",
                    )
                    response = await client.post("/api/color-grade/video", data=form)
                    self.assertEqual(response.status, 200, await response.text())
                    payload = await response.json()
                    self.assertEqual(payload["kind"], "video")
                    self.assertTrue(payload["url"].startswith("/api/upload/grade_"))
                    self.assertTrue(
                        (root / "data" / "uploads" / Path(payload["url"]).name).is_file()
                    )


if __name__ == "__main__":
    unittest.main()
