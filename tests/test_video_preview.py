import asyncio
import ast
import copy
import json
import math
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest import mock

import aiohttp
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))
import app as controller_app
import auth_support
from capacity import CapacityStore
from video_preview import VideoPreviews


class VideoPreviewTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.uploads = self.root / "data" / "uploads"
        self.uploads.mkdir(parents=True)
        self.previews = VideoPreviews(
            self.uploads, controller_app.ffmpeg_bin, controller_app.VID_EXT,
        )
        self.old_project_dir = controller_app.PROJ_DIR
        controller_app.PROJ_DIR = self.root / "data" / "projects"
        self.own_project("p")
        app = self.build_app()
        app["comfy_lock"] = asyncio.Lock()
        app["cleanup_pending"] = set()
        app["cleanup_tasks"] = {}
        app["video_previews"] = self.previews
        app["session"] = object()
        app["distributed"] = mock.Mock()
        app.router.add_post("/api/upload", controller_app.api_upload)
        app.router.add_post("/api/generate", controller_app.api_generate)
        app.router.add_get("/api/preview/{name}/file", controller_app.api_preview_file)
        app.router.add_get("/api/preview/{name}", controller_app.api_preview_status)
        app.router.add_get("/api/upload/{name}", controller_app.api_upload_file)
        await self.start_client(app)

    async def asyncTearDown(self):
        await self.previews.close()
        await self.client.close()
        controller_app.PROJ_DIR = self.old_project_dir
        self.auth_teardown()

    def source(self, name="ck_123456789abc.mov", data=b"original"):
        path = self.uploads / name
        path.write_bytes(data)
        self.register_asset(name)
        return path

    async def test_missing_ffmpeg_keeps_original_and_reports_error(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: None
        first = self.previews.ensure(path.name)
        self.assertEqual(first["status"], "queued")
        await self.previews.tasks[path.name]
        response = await self.client.get(f"/api/preview/{path.name}")
        state = await response.json()
        self.assertEqual(state["status"], "error")
        self.assertIn("FFmpeg", state["error"])
        self.assertIn("no-store", response.headers["Cache-Control"])
        self.assertEqual(path.read_bytes(), b"original")
        self.assertFalse(self.previews.target(path.name).exists())
        response = await self.client.get(f"/api/preview/{path.name}/file")
        self.assertEqual(response.status, 404)

    async def test_validates_source_and_rejects_traversal(self):
        for name in ("../outside.mov", "..\\outside.mov", "/outside.mov", "file.txt"):
            with self.subTest(name=name), self.assertRaises(web.HTTPBadRequest):
                self.previews.ensure(name)
        with self.assertRaises(web.HTTPNotFound):
            self.previews.ensure("missing.mp4")

    async def test_completed_cache_survives_restart_and_supports_range(self):
        path = self.source()
        self.previews.target(path.name).write_bytes(b"0123456789")
        state = self.previews.ensure(path.name)
        self.assertEqual(state["status"], "ready")
        self.assertFalse(self.previews.tasks)
        response = await self.client.get(state["url"], headers={"Range": "bytes=2-5"})
        self.assertEqual(response.status, 206)
        self.assertEqual(response.headers["Content-Type"], "video/mp4")
        self.assertEqual(response.headers["Content-Range"], "bytes 2-5/10")
        self.assertEqual(await response.read(), b"2345")
        original = await self.client.get(f"/api/upload/{path.name}")
        self.assertEqual(await original.read(), b"original")

    async def test_deduplicates_and_limits_conversion_concurrency(self):
        first = self.source()
        second = self.source("ck_123456789abd.mp4")
        started = asyncio.Event()
        release = asyncio.Event()
        calls = []

        async def spawn(*args, **kwargs):
            calls.append(args)
            process = mock.Mock(returncode=None)

            async def communicate():
                started.set()
                await release.wait()
                Path(args[-1]).write_bytes(b"preview")
                process.returncode = 0
                return b"", b""

            process.communicate = communicate
            return process

        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")
        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            self.previews.ensure(first.name)
            self.previews.ensure(first.name)
            await asyncio.wait_for(started.wait(), 5)
            self.previews.ensure(second.name)
            response = await self.client.get(f"/api/preview/{second.name}")
            self.assertEqual((await response.json())["status"], "queued")
            self.assertEqual(len(calls), 1)
            release.set()
            await asyncio.gather(*self.previews.tasks.values())
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.previews.ensure(first.name)["status"], "ready")
        self.assertEqual(first.read_bytes(), b"original")

    async def test_failure_removes_partial_preview(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")

        async def spawn(*args, **kwargs):
            Path(args[-1]).write_bytes(b"incomplete")
            return mock.Mock(returncode=1, communicate=mock.AsyncMock(return_value=(b"", b"bad codec")))

        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            with self.assertLogs("video_preview", level="ERROR"):
                self.previews.ensure(path.name)
                await self.previews.tasks[path.name]
        self.assertEqual(self.previews.ensure(path.name)["status"], "error")
        self.assertFalse(list(self.uploads.glob("*.part.mp4")))
        self.assertFalse(self.previews.target(path.name).exists())
        self.assertEqual(path.read_bytes(), b"original")

    async def test_local_upload_keeps_original_only_as_backup(self):
        self.previews.ffmpeg_bin = lambda: None
        form = aiohttp.FormData()
        original = b"original mov bytes"
        form.add_field("file", original, filename="original.mov", content_type="video/quicktime")
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.object(controller_app, "probe_video", return_value={}), \
             mock.patch.object(controller_app, "comfy_upload", new_callable=mock.AsyncMock) as upload:
            upload.return_value = "chouka/original.mov"
            response = await self.client.post(
                "/api/upload", data=form, params={"project": "p"}, headers=self.headers)
        asset = (await response.json())["files"][0]
        self.assertTrue(asset["ref"].startswith("chouka/ck_"))
        self.assertTrue(asset["ref"].endswith(".mov"))
        upload.assert_not_awaited()
        response = await self.client.get(asset["url"])
        self.assertEqual(await response.read(), original)

    async def test_shutdown_stops_encoder_and_removes_partial_file(self):
        path = self.source()
        self.previews.ffmpeg_bin = lambda: Path("ffmpeg")
        started = asyncio.Event()
        stopped = asyncio.Event()
        process = mock.Mock(returncode=None)

        async def communicate():
            started.set()
            await stopped.wait()
            return b"", b""

        def kill():
            process.returncode = -9
            stopped.set()

        process.communicate = communicate
        process.kill = kill

        async def spawn(*args, **kwargs):
            Path(args[-1]).write_bytes(b"incomplete")
            return process

        with mock.patch("video_preview.asyncio.create_subprocess_exec", side_effect=spawn):
            self.previews.ensure(path.name)
            await asyncio.wait_for(started.wait(), 5)
            await asyncio.wait_for(self.previews.close(), 5)
        self.assertTrue(stopped.is_set())
        self.assertFalse(list(self.uploads.glob("*.part.mp4")))
        self.assertFalse(self.previews.target(path.name).exists())
        self.assertEqual(path.read_bytes(), b"original")

    async def test_controller_dispatches_converted_video_in_graph_and_worker_assets(self):
        original = self.source()
        converted = self.previews.target(original.name)
        converted.write_bytes(b"compatible mp4")
        graph = {"1": {"class_type": "VHS_LoadVideo", "inputs": {"video": ""}}}
        (self.root / "graph.json").write_text(json.dumps(graph), encoding="utf-8")
        cap = {
            "id": "test-video", "name": "test-video", "_graph_ok": True,
            "graph": "graph.json", "outputType": "video", "inputs": [{
                "key": "video[0]", "type": "video", "label": "video", "required": True,
                "target": {"node": "1", "input": "video"},
            }],
        }
        body = {"capability": "test-video", "assets": {"video[0]": f"chouka/{original.name}"},
                "project": "p"}
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", True), \
             mock.patch.dict(controller_app.CAPS, {"test-video": cap}), \
             mock.patch.object(controller_app, "JOBS", {}), \
             mock.patch.object(controller_app, "STEPS", {}), \
             mock.patch.object(controller_app, "WEIGHTS", {}), \
             mock.patch.object(controller_app, "save_jobs"):
            response = await self.client.post("/api/generate", json=body, headers=self.headers)
        self.assertEqual(response.status, 200, await response.text())
        payload = self.client.server.app["distributed"].enqueue.call_args.args[1]
        expected = f"chouka/{converted.name}"
        self.assertEqual(payload["graph"]["1"]["inputs"]["video"], expected)
        self.assertEqual(payload["assets"]["video[0]"], expected)
        response = await self.client.get(f"/api/upload/{converted.name}")
        self.assertEqual(await response.read(), b"compatible mp4")
        self.assertEqual(original.read_bytes(), b"original")

    async def test_generation_rejects_pending_or_failed_transcode(self):
        original = self.source()
        cap = {"id": "test-video", "_graph_ok": True}
        body = {"capability": "test-video", "assets": {"video[0]": f"chouka/{original.name}"},
                "project": "p"}
        for state, status in (({"status": "processing"}, 409),
                              ({"status": "error", "error": "转码失败"}, 422)):
            with self.subTest(state=state), \
                 mock.patch.dict(controller_app.CAPS, {"test-video": cap}), \
                 mock.patch.object(self.previews, "ensure", return_value=state):
                response = await self.client.post(
                    "/api/generate", json=body, headers=self.headers)
                self.assertEqual(response.status, status)
                self.assertIn("转码", await response.text())
        self.client.server.app["distributed"].enqueue.assert_not_called()

    async def test_local_generation_uploads_only_converted_mp4_once(self):
        original = self.source()
        converted = self.previews.target(original.name)
        converted.write_bytes(b"compatible mp4")
        request = mock.Mock(app=self.client.server.app)
        assets = {"video[0]": f"chouka/{original.name}", "video[1]": f"chouka/{original.name}",
                  "images[0]": "chouka/image.png"}
        with mock.patch.object(controller_app, "CONTROLLER_MODE", False), \
             mock.patch.object(controller_app, "comfy_upload", new_callable=mock.AsyncMock) as upload:
            upload.return_value = f"chouka/{converted.name}"
            resolved = await controller_app.generation_assets(request, assets)
        upload.assert_awaited_once_with(request.app["session"], "file", converted.name, b"compatible mp4")
        self.assertEqual(resolved["video[0]"], f"chouka/{converted.name}")
        self.assertEqual(resolved["video[1]"], resolved["video[0]"])
        self.assertEqual(resolved["images[0]"], assets["images[0]"])
        self.assertEqual(assets["video[0]"], f"chouka/{original.name}")

    async def test_real_mov_upload_creates_h264_for_preview_and_generation(self):
        executable = controller_app.ffmpeg_bin()
        if executable is None:
            self.skipTest("FFmpeg unavailable")
        fixture = self.root / "prores.mov"
        process = await asyncio.create_subprocess_exec(
            str(executable), "-nostdin", "-v", "error", "-y",
            "-f", "lavfi", "-i", "testsrc2=size=64x48:rate=12:duration=0.5",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=0.5",
            "-c:v", "prores_ks", "-pix_fmt", "yuv422p10le", "-threads", "1",
            "-c:a", "pcm_s16le", str(fixture),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, error = await process.communicate()
        self.assertEqual(process.returncode, 0, error)
        original = fixture.read_bytes()
        form = aiohttp.FormData()
        form.add_field("file", original, filename="原片.MOV", content_type="video/quicktime")
        with mock.patch.object(controller_app, "ROOT", self.root), \
             mock.patch.object(controller_app, "CONTROLLER_MODE", True):
            response = await self.client.post(
                "/api/upload", data=form, params={"project": "p"}, headers=self.headers)
        self.assertEqual(response.status, 200)
        asset = (await response.json())["files"][0]
        name = asset["url"].rsplit("/", 1)[1]
        self.assertTrue(name.endswith(".mov"))
        self.assertEqual(asset["ref"], f"chouka/{name}")
        self.assertEqual((self.uploads / name).read_bytes(), original)
        self.assertEqual(asset["fps"], 12)
        task = self.previews.tasks.get(name)
        if task:
            await asyncio.wait_for(task, 30)
        state = self.previews.ensure(name)
        self.assertEqual(state["status"], "ready", state)
        process = await asyncio.create_subprocess_exec(
            str(executable), "-hide_banner", "-i", str(self.previews.target(name)),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        _, info = await process.communicate()
        info = info.decode("utf-8", errors="replace")
        self.assertIn("Video: h264", info)
        self.assertIn("yuv420p", info)
        self.assertIn("Audio: aac", info)
        self.assertIn("12 fps", info)
        contents = self.previews.target(name).read_bytes()
        with mock.patch.object(controller_app, "CONTROLLER_MODE", True):
            refs = await controller_app.generation_assets(
                mock.Mock(app=self.client.server.app), {"video[0]": asset["ref"]},
                project_id="p",
            )
        self.assertEqual(refs["video[0]"], f"chouka/{name}.browser.mp4")
        worker_download = await self.client.get(f"/api/upload/{Path(refs['video[0]']).name}")
        self.assertEqual(await worker_download.read(), contents)
        self.assertLess(contents.index(b"moov"), contents.index(b"mdat"))
        response = await self.client.get(state["url"], headers={"Range": "bytes=0-31"})
        self.assertEqual(response.status, 206)
        self.assertEqual(len(await response.read()), 32)
        response = await self.client.get(asset["url"])
        self.assertEqual(await response.read(), original)


class ReferenceVideoOutputTest(unittest.TestCase):
    """真实 manifest/图的离线补丁测试，不启动 HTTP、数据库或生成服务。"""
    capabilities = ("minimax_h3_ref9", "minimax_h3_ref_2pass",
                    "minimax_h3_fusion_v2", "minimax_h3_character_transfer")
    ref = "chouka/reference.mp4"

    def cap(self, cid):
        return json.loads((ROOT / "manifests" / f"{cid}.json").read_text(encoding="utf-8"))

    def graph(self, cap):
        return json.loads((ROOT / cap["graph"]).read_text(encoding="utf-8"))

    def patch(self, cid, info=None, params=None, assets=None):
        cap = self.cap(cid)
        metadata = {"width": 1000, "height": 733, "duration": 6, "has_audio": True}
        if info is not None:
            metadata.update(info)
        params = {"seed": 42, "aspect_ratio": "21:9 (Ultrawide)", "duration": 6,
                  **(params or {})}
        assets = {"video[0]": self.ref, "images[0]": "chouka/person.png"} if assets is None else assets
        with mock.patch.object(controller_app, "probe_video", side_effect=AssertionError("must use cache")):
            graph = controller_app.patch_graph(cap, params, assets, {self.ref: metadata})
        return cap, params, graph

    def output(self, graph, character=False):
        return next(node["inputs"] for node in graph.values()
                    if node["class_type"] == ("CreateVideo" if character else "VHS_VideoCombine"))

    def test_all_four_caps_use_selected_dimensions_and_keep_templates_models(self):
        for cid in self.capabilities:
            with self.subTest(cid=cid):
                cap = self.cap(cid)
                before = (ROOT / cap["graph"]).read_bytes()
                original = self.graph(cap)
                with mock.patch.object(controller_app, "resolve_reference_video_output_settings", return_value=None):
                    _, _, baseline = self.patch(cid)
                _, params, graph = self.patch(cid)
                character = cid.endswith("character_transfer")
                if character:
                    ideal_width, ideal_height = 352, 640
                    planner = graph["11"]["inputs"]
                    self.assertEqual((planner["width"], planner["height"]), (352, 640))
                    self.assertNotIn("preview_seconds", params)
                else:
                    mp = next(s["default"] for s in cap["inputs"] if s["key"] == "megapixels")
                    ideal_width = math.sqrt(mp * 1024 * 1024 * 21 / 9)
                    ideal_height = math.sqrt(mp * 1024 * 1024 * 9 / 21)
                    selectors = {s["target"]["node"] for s in cap["inputs"] if s["key"] == "aspect_ratio"}
                    for node in graph.values():
                        for link in node["inputs"].values():
                            self.assertFalse(isinstance(link, list) and len(link) == 2
                                             and link[0] in selectors and link[1] in (0, 1))
                        if node["class_type"] == "MiniMaxH3ReferenceToVideo":
                            self.assertEqual((node["inputs"]["width"], node["inputs"]["height"]),
                                             (round(ideal_width / 32) * 32, round(ideal_height / 32) * 32))
                    for selector in selectors:
                        self.assertEqual(graph[selector], baseline[selector])
                    self.assertEqual(params["duration"], 6)
                output = self.output(graph, character)
                scale = graph[output["images"][0]]
                self.assertEqual(scale["class_type"], "ImageScale")
                scale = scale["inputs"]
                factor = 1.5 if cid.endswith("ref_2pass") else 1
                self.assertEqual((scale["width"], scale["height"]),
                                 (round(ideal_width * factor / 2) * 2,
                                  round(ideal_height * factor / 2) * 2))
                self.assertLessEqual(abs(scale["width"] - ideal_width * factor), 1)
                self.assertLessEqual(abs(scale["height"] - ideal_height * factor), 1)
                self.assertEqual((scale["upscale_method"], scale["crop"]), ("bicubic", "disabled"))
                for nid, node in original.items():
                    if any(part in node["class_type"] for part in
                           ("UNETLoader", "CLIPLoader", "VAELoader", "LoraLoader", "KSamplerSelect",
                            "ManualSigmas", "BasicScheduler", "SamplerCustomAdvanced", "FiniteSegmentSampler")):
                        self.assertEqual(graph[nid], baseline[nid])
                for nid in graph.keys() - original.keys():
                    self.assertRegex(graph[nid]["_meta"]["title"], r"[\u4e00-\u9fff]")
                self.assertEqual((ROOT / cap["graph"]).read_bytes(), before)

    def test_capacity_and_costs_use_final_delivery_not_generation_dimensions(self):
        for cid in self.capabilities:
            with self.subTest(cid=cid):
                cap, params, graph = self.patch(
                    cid, {"width": 720, "height": 1280, "duration": 10.013},
                    {"duration": 7, "output_width": 999, "output_duration": 1})
                character = cid.endswith("character_transfer")
                duration = 10.013 if character else 7
                output = self.output(graph, character)
                scaled = graph[output["images"][0]]["inputs"]
                dims = controller_app.CostLedger.dimensions(
                    None, cid, params, {"video[0]": self.ref}, graph,
                    lambda ref: {"duration": 10.013})
                self.assertEqual((dims["width"], dims["height"], dims["duration"]),
                                 (scaled["width"], scaled["height"], duration))
                self.assertEqual(params["duration"], 7)
                for recorded in (dims, {}):
                    spec = controller_app.make_spec(cid, {**params, "output_kind": "video"}, graph, recorded)
                    expected = spec["expected"]
                    self.assertEqual((expected["width"], expected["height"], expected["duration"]),
                                     (scaled["width"], scaled["height"], duration))
                    actual = {**expected, "valid": True, "bytes": 100000}
                    count, _, warnings = CapacityStore._technical(spec, "done", [actual])
                    self.assertEqual(count, 1)
                    self.assertEqual(warnings, [])

    def test_delivery_dimensions_and_estimates_survive_dispatch_backfill(self):
        with tempfile.TemporaryDirectory() as folder:
            ledger = controller_app.CostLedger(Path(folder) / "costs.db", ROOT / "pricing.json")
            try:
                ledger.db.execute("CREATE TABLE dispatch_jobs(job_id TEXT,status TEXT,worker_id TEXT,"
                                  "payload_json TEXT,created_at REAL,updated_at REAL)")
                snapshots = {}
                for cid in self.capabilities:
                    _, params, graph = self.patch(
                        cid, {"width": 1000, "height": 738, "duration": 19.125},
                        {"width": 768, "height": 768, "duration": 7})
                    assets = {"video[0]": self.ref, "images[0]": "chouka/person.png"}
                    ledger.record_job({"id": cid, "capability": cid, "status": "queued", "created": 1},
                                      params, assets, graph, lambda ref: {"duration": 19.125})
                    payload = json.dumps({"capability": cid, "graph": graph, "assets": assets})
                    ledger.db.execute("INSERT INTO dispatch_jobs VALUES (?,?,?,?,?,?)",
                                      (cid, "queued", "worker", payload, 1, 1))
                    snapshots[cid] = dict(ledger.db.execute(
                        "SELECT * FROM cost_events WHERE job_id=?", (cid,)).fetchone())
                ledger.db.commit()
                ledger.backfill([])
                for cid, before in snapshots.items():
                    with self.subTest(cid=cid):
                        after = dict(ledger.db.execute(
                            "SELECT * FROM cost_events WHERE job_id=?", (cid,)).fetchone())
                        old_dims, new_dims = (json.loads(row["dimensions_json"]) for row in (before, after))
                        for key in ("width", "height", "duration", "output_width", "output_height",
                                    "output_duration", "output_fps", "output_count"):
                            self.assertEqual(new_dims[key], old_dims[key], key)
                        for key in ("estimated_min_micros", "estimated_max_micros"):
                            self.assertEqual(after[key], before[key], key)
            finally:
                ledger.close()

    def test_bf16_1080p_delivery_and_first_pass_metadata_survive_graph_only_backfill(self):
        cid = "minimax_h3_ref_2pass_bf16"
        with tempfile.TemporaryDirectory() as folder, closing(
                controller_app.CostLedger(Path(folder) / "costs.db", ROOT / "pricing.json")) as ledger:
            ledger.db.execute("CREATE TABLE dispatch_jobs(job_id TEXT,status TEXT,worker_id TEXT,"
                              "payload_json TEXT,created_at REAL,updated_at REAL)")
            snapshots = {}
            for ratio in ("16:9 (Widescreen)", "9:16 (Portrait Widescreen)", "21:9 (Ultrawide)"):
                for reference in (False, True):
                    assets = {"video[0]": self.ref} if reference else {}
                    for scale in (1, 1.5, 2):
                        _, params, graph = self.patch(cid, params={
                            "output_1080p": "on", "aspect_ratio": ratio, "scale_by": scale,
                            "duration": 7.375, "megapixels": .2,
                            "output_width": 2, "output_height": 2,
                        }, assets=assets)
                        job_id = f"{ratio.split()[0]}-{reference}-{scale}"
                        ledger.record_job({"id": job_id, "capability": cid, "status": "queued", "created": 1},
                                          params, assets, graph)
                        payload = json.dumps({"capability": cid, "graph": graph, "assets": assets})
                        ledger.db.execute("INSERT INTO dispatch_jobs VALUES (?,?,?,?,?,?)",
                                          (job_id, "queued", "worker", payload, 1, 1))
                        before = dict(ledger.db.execute(
                            "SELECT * FROM cost_events WHERE job_id=?", (job_id,)).fetchone())
                        snapshots[job_id] = (before, params, graph, reference)
            ledger.db.commit()
            ledger.backfill([])
            for job_id, (before, params, graph, reference) in snapshots.items():
                with self.subTest(job_id=job_id):
                    after = dict(ledger.db.execute(
                        "SELECT * FROM cost_events WHERE job_id=?", (job_id,)).fetchone())
                    old_dims, dims = (json.loads(row["dimensions_json"]) for row in (before, after))
                    generation = graph["186"]["inputs"]
                    for key in ("width", "height", "output_width", "output_height", "output_fps",
                                "output_count", "megapixels"):
                        self.assertEqual(dims[key], old_dims[key], key)
                    self.assertEqual(dims["megapixels"], generation["width"] * generation["height"] / 1024 ** 2)
                    spec = controller_app.make_spec(cid, {}, graph, dims)
                    self.assertEqual((spec["expected"]["width"], spec["expected"]["height"]),
                                     (params["output_width"], params["output_height"]))
                    self.assertEqual(spec["expected"]["count"], 1)
                    if reference:
                        self.assertEqual(dims["output_duration"], 7.375)
                        self.assertEqual(dims["output_fps"], round(7.375 * 24) / 7.375)
                    for key in ("estimated_min_micros", "estimated_max_micros"):
                        self.assertEqual(after[key], before[key], key)

    def test_no_video_preserves_old_graph_and_does_not_manufacture_output_fields(self):
        for cid in self.capabilities:
            cap = self.cap(cid)
            # Character mode normally requires a video; isolate its no-reference graph path.
            cap = copy.deepcopy(cap)
            for spec in cap["inputs"]:
                spec["required"] = False
            for assets in ({}, {"undeclared_video": self.ref}):
                with self.subTest(cid=cid, assets=assets), \
                     mock.patch.object(controller_app, "probe_video") as probe:
                    params = {"seed": 42}
                    with mock.patch.object(controller_app, "resolve_reference_video_output_settings", return_value=None):
                        baseline = controller_app.patch_graph(cap, dict(params), assets)
                    graph = controller_app.patch_graph(cap, params, assets)
                    self.assertEqual(graph, baseline)
                    self.assertFalse(any(key.startswith("output_") for key in params))
                    self.assertFalse(any(key.startswith("follow_reference_") for key in graph))
                    probe.assert_not_called()
                    params["output_width"] = 999
                    controller_app.patch_graph(cap, params, assets)
                    self.assertEqual(params["output_width"], 999)

    def test_missing_params_use_manifest_defaults_not_source_metadata(self):
        for cid in self.capabilities[:3]:
            cap = self.cap(cid)
            defaults = {spec["key"]: spec.get("default") for spec in cap["inputs"]}
            for missing in ({}, {"aspect_ratio": None, "duration": ""}):
                with self.subTest(cid=cid, missing=missing):
                    params = {"seed": 42, **missing}
                    metadata = {self.ref: {"width": 720, "height": 1280, "duration": 19,
                                          "has_audio": True}}
                    graph = controller_app.patch_graph(cap, params, {"video[0]": self.ref}, metadata)
                    self.assertEqual(params["duration"], defaults["duration"])
                    self.assertEqual(params["aspect_ratio"], defaults["aspect_ratio"])
                    ratio = defaults["aspect_ratio"].split()[0].split(":")
                    mp = defaults["megapixels"]
                    factor = defaults.get("scale_by", 1)
                    self.assertEqual(params["output_width"],
                                     round(math.sqrt(mp * 1024**2 * float(ratio[0]) / float(ratio[1])) * factor / 2) * 2)
                    self.assertEqual(params["output_duration"], defaults["duration"])
                    self.assertIn("follow_reference_scale_" + cap["output"]["node"], graph)

    def test_manual_ratio_and_duration_respected_with_portrait_long_reference(self):
        for cid in self.capabilities[:3]:
            with self.subTest(cid=cid):
                cap, params, graph = self.patch(
                    cid, {"width": 720, "height": 1280, "duration": 19},
                    {"aspect_ratio": "21:9 (Ultrawide)", "duration": 4.1,
                     **{"output_" + key: 999 for key in ("width", "height", "duration", "fps", "count")}})
                self.assertEqual(params["aspect_ratio"], "21:9 (Ultrawide)")
                self.assertEqual(params["duration"], 4.1)
                mp = next(spec["default"] for spec in cap["inputs"] if spec["key"] == "megapixels")
                factor = 1.5 if cid.endswith("ref_2pass") else 1
                self.assertEqual(params["output_width"], round(math.sqrt(mp * 1024**2 * 21 / 9) * factor / 2) * 2)
                self.assertEqual(params["output_height"], round(math.sqrt(mp * 1024**2 * 9 / 21) * factor / 2) * 2)
                self.assertEqual(params["output_count"], 1)
                self.assertEqual(params["output_duration"], 4.1)
                self.assertEqual(params["output_fps"], round(4.1 * 24) / 4.1)
                output = self.output(graph)
                trim = graph[graph[output["images"][0]]["inputs"]["image"][0]]["inputs"]
                self.assertEqual(trim["length"], round(4.1 * 24))
                self.assertAlmostEqual(trim["length"] / output["frame_rate"], 4.1)

    def test_six_seconds_pad_158_but_trim_144_not_slow_motion(self):
        for cid in self.capabilities[:3]:
            with self.subTest(cid=cid):
                cap, _, graph = self.patch(cid)
                original = self.graph(cap)
                for nid, node in graph.items():
                    if node["class_type"] == "MiniMaxH3ReferenceToVideo":
                        self.assertEqual(node["inputs"]["length"], 158)
                    elif node["class_type"].startswith("VHS_LoadVideo"):
                        self.assertEqual(node["inputs"]["force_rate"], 24)
                        self.assertEqual(node["inputs"]["frame_load_cap"], 158)
                        self.assertEqual(node["inputs"]["video"], self.ref)
                output = self.output(graph)
                scale = graph[output["images"][0]]["inputs"]
                trim = graph[scale["image"][0]]
                self.assertEqual(trim["class_type"], "ImageFromBatch")
                self.assertEqual(trim["inputs"], {"image": self.output(original)["images"],
                                                  "batch_index": 0, "length": 144})
                self.assertEqual(output["frame_rate"], 24)
                self.assertFalse(output["trim_to_audio"])
                self.assertEqual(output["audio"], self.output(original)["audio"])

    def test_fractional_seconds_preserve_exact_duration(self):
        for cid in self.capabilities[:3]:
            for seconds in (6.013, 0.25, 16.127):
                with self.subTest(cid=cid, seconds=seconds):
                    cap, params, graph = self.patch(cid, params={"duration": seconds})
                    n = max(1, round(seconds * 24))
                    output = self.output(graph)
                    scale = graph[output["images"][0]]["inputs"]
                    self.assertEqual(graph[scale["image"][0]]["inputs"]["length"], n)
                    self.assertAlmostEqual(n / output["frame_rate"], seconds)
                    self.assertEqual(params["duration"], seconds)
                    duration_spec = next(s for s in cap["inputs"] if s["key"] == "duration")
                    self.assertEqual(graph[duration_spec["target"]["node"]]["inputs"]["value"], seconds)

    def test_submitted_duration_shorter_than_five_frames_is_rejected_before_generation(self):
        for cid in self.capabilities[:3]:
            for seconds in (0.02, 0.1):
                with self.subTest(cid=cid, seconds=seconds), self.assertRaises(web.HTTPBadRequest) as error:
                    self.patch(cid, params={"duration": seconds})
                self.assertIn("至少需要 5 帧", error.exception.reason)

    def test_invalid_submitted_duration_is_rejected_without_using_valid_source(self):
        for cid in self.capabilities[:3]:
            for invalid in (0, -1, "invalid", float("nan"), float("inf")):
                with self.subTest(cid=cid, invalid=invalid), self.assertRaises(web.HTTPBadRequest):
                    self.patch(cid, params={"duration": invalid})

    def test_real_frame_limit_not_manifest_fifteen_seconds(self):
        for seconds in (16, 30, 149.6666666667):
            _, _, graph = self.patch(self.capabilities[0], params={"duration": seconds})
            reference = next(n for n in graph.values() if n["class_type"] == "MiniMaxH3ReferenceToVideo")
            self.assertLessEqual(reference["inputs"]["length"], 3600)
        for seconds in (150, 200, 1e308):
            with self.subTest(seconds=seconds), self.assertRaises(web.HTTPBadRequest) as error:
                self.patch(self.capabilities[0], params={"duration": seconds})
            self.assertRegex(error.exception.reason, "3600|时长超出")

    def test_megapixels_custom_scale_and_portrait_not_capped_by_manifest(self):
        _, _, graph = self.patch(self.capabilities[1], params={
            "aspect_ratio": "9:16 (Portrait Widescreen)", "megapixels": 2.5, "scale_by": 2})
        output = self.output(graph)
        scale = graph[output["images"][0]]["inputs"]
        self.assertEqual(scale["width"], round(math.sqrt(2.5 * 1024 * 1024 * 9 / 16) * 2 / 2) * 2)
        self.assertEqual(scale["height"], round(math.sqrt(2.5 * 1024 * 1024 * 16 / 9) * 2 / 2) * 2)
        self.assertEqual(graph["199"]["inputs"]["scale_by"], 2)

    def test_megapixels_accepts_above_manifest_but_rejects_above_actual_sixteen_mp(self):
        for mp in (1.31, 2.5, 16):
            with self.subTest(mp=mp):
                _, _, graph = self.patch(self.capabilities[0], params={
                    "aspect_ratio": "1:1 (Square)", "megapixels": mp})
                output = self.output(graph)
                scale = graph[output["images"][0]]["inputs"]
                self.assertEqual(scale["width"], round(math.sqrt(mp) * 1024 / 2) * 2)
        for mp in (16.000001, 17, float("inf"), float("nan"), 0, -1):
            with self.subTest(mp=mp), self.assertRaises(web.HTTPBadRequest):
                self.patch(self.capabilities[0], params={"megapixels": mp})

    def test_generation_width_height_actual_inclusive_node_boundaries(self):
        for width, height in ((16384, 32), (32, 16384), (32, 32)):
            with self.subTest(width=width, height=height):
                _, _, graph = self.patch(self.capabilities[3], params={"width": width, "height": height})
                self.assertEqual((graph["11"]["inputs"]["width"], graph["11"]["inputs"]["height"]),
                                 (width, height))
        for width, height in ((16416, 32), (32, 16416)):
            with self.subTest(width=width, height=height), self.assertRaises(web.HTTPBadRequest):
                self.patch(self.capabilities[3], params={"width": width, "height": height})
        with self.assertRaises(web.HTTPBadRequest):
            self.patch(self.capabilities[3], params={"width": 1, "height": 1})

    def test_character_full_and_preview_preserve_segments_dimensions_and_sampler(self):
        for preview, seconds in ((0, 300.013), (5, 5), (400, 300.013)):
            with self.subTest(preview=preview):
                cap, params, graph = self.patch(
                    self.capabilities[3], {"duration": 300.013, "has_audio": False},
                    {"duration": 7, "preview_seconds": preview, "width": 970, "height": 550})
                self.assertEqual(params["duration"], 7)
                self.assertEqual(params["preview_seconds"], preview)
                planner = graph["11"]["inputs"]
                self.assertEqual(planner["generation_seconds"], 7)
                self.assertEqual((planner["width"], planner["height"]), (960, 544))
                self.assertEqual((params["output_width"], params["output_height"]), (970, 550))
                self.assertEqual(params["output_duration"], seconds)
                dims = controller_app.CostLedger.dimensions(
                    None, self.capabilities[3], params, {"video[0]": self.ref}, graph,
                    lambda ref: {"duration": 300.013})
                backfilled_dims = controller_app.CostLedger.dimensions(
                    None, self.capabilities[3], {}, {"video[0]": self.ref}, graph, None)
                for measured in (dims, backfilled_dims):
                    self.assertEqual((measured["source_duration"], measured["duration"],
                                      measured["output_duration"]), (seconds, seconds, seconds))
                for recorded in (dims, backfilled_dims, {}):
                    spec = controller_app.make_spec(self.capabilities[3], params, graph, recorded)
                    self.assertEqual((spec["expected"]["width"], spec["expected"]["height"],
                                      spec["expected"]["duration"]), (970, 550, seconds))
                timeline = json.loads(planner["timeline_data"])
                self.assertEqual(timeline["selection"]["duration"], 7)
                clip = timeline["videoClips"][0]
                self.assertEqual((clip["duration"], clip["sourceDuration"], clip["trimStart"]),
                                 (seconds, seconds, 0))
                self.assertFalse(clip["hasAudio"])
                self.assertEqual(timeline["segmentConfig"], {"count": 0, "segments": []})
                self.assertEqual(graph["43"]["inputs"]["overlap_frames"], 48)
                self.assertFalse(any(node["class_type"] == "ImageFromBatch" for node in graph.values()))
                self.assertAlmostEqual(self.output(graph, True)["fps"], round(seconds * 24) / seconds)
                original = self.graph(cap)
                self.assertEqual(graph["30"]["inputs"], {**original["30"]["inputs"], "seed": 42})
                self.assertEqual(graph["23"]["inputs"]["audio"], original["23"]["inputs"]["audio"])

    def test_muted_references_disconnect_audio_only(self):
        for cid in self.capabilities[:2]:
            with self.subTest(cid=cid):
                cap, _, graph = self.patch(cid, {"has_audio": False})
                spec = next(s for s in cap["inputs"] if s["type"] == "video")
                for drop in spec["dropIfNoAudio"]:
                    self.assertNotIn(drop["input"], graph[drop["node"]]["inputs"])
                references = next(n["inputs"] for n in graph.values()
                                  if n["class_type"] == "MiniMaxH3ReferenceToVideo")
                self.assertIn("ref_videos.ref_video_0", references)

    def test_invalid_source_metadata_never_overwrites_mp_output_params(self):
        for cid in self.capabilities[:3]:
            for key in ("width", "height", "duration"):
                for invalid in (None, 0, -1, "invalid", float("nan"), float("inf")):
                    with self.subTest(cid=cid, key=key, invalid=invalid):
                        _, params, _ = self.patch(cid, {key: invalid}, {"duration": 4.1})
                        self.assertEqual(params["duration"], 4.1)
                        self.assertEqual(params["aspect_ratio"], "21:9 (Ultrawide)")
                        self.assertEqual(params["output_duration"], 4.1)
        # Fusion has no audio probe requirement; resolving MP specs needs no source probe.
        with mock.patch.object(controller_app, "probe_video") as probe:
            controller_app.patch_graph(self.cap(self.capabilities[2]), {"seed": 42}, {"video[0]": self.ref})
            probe.assert_not_called()

    def test_character_rejects_invalid_trusted_duration_and_short_source(self):
        for invalid in (None, 0, -1, "invalid", float("nan"), float("inf"), 4.9):
            with self.subTest(invalid=invalid), self.assertRaises(web.HTTPBadRequest):
                self.patch(self.capabilities[3], {"duration": invalid}, {"duration": 10, "output_duration": 99})

    def test_submitted_ratio_and_final_size_limits_are_validated(self):
        for params in ({"aspect_ratio": "1000000000:1"}, {"aspect_ratio": "1:1000000000"},
                       {"aspect_ratio": "16:9"}, {"aspect_ratio": "invalid"},
                       {"megapixels": 1e5}, {"megapixels": 1e-9},
                       {"megapixels": float("nan")}, {"scale_by": 100}):
            with self.subTest(params=params), self.assertRaises(web.HTTPBadRequest):
                self.patch(self.capabilities[1], params=params)

    def test_first_populated_slot_server_probe_and_stable_noncolliding_ids(self):
        cap = self.cap(self.capabilities[0])
        spec = copy.deepcopy(next(s for s in cap["inputs"] if s["type"] == "video"))
        spec["key"] = "video[1]"
        cap["inputs"].insert(1, spec)
        params = {"aspect_ratio": "21:9 (Ultrawide)", "duration": 4.1, "seed": 42}
        info = {"width": 977, "height": 733, "duration": 7, "has_audio": True}
        with mock.patch.object(controller_app, "probe_video", return_value=info) as probe:
            graph = controller_app.patch_graph(cap, params, {"video[1]": self.ref})
            probe.assert_called_once_with(self.ref)
        self.assertEqual(params["duration"], 4.1)
        template = self.graph(cap)
        template["follow_reference_trim_38"] = {"class_type": "PrimitiveInt", "inputs": {"value": 123}}
        with mock.patch.object(controller_app.Path, "read_text", return_value=json.dumps(template)):
            one = controller_app.patch_graph(cap, dict(params), {"video[1]": self.ref}, {self.ref: info})
            two = controller_app.patch_graph(cap, dict(params), {"video[1]": self.ref}, {self.ref: info})
        self.assertEqual(one, two)
        self.assertEqual(one["follow_reference_trim_38"], template["follow_reference_trim_38"])
        self.assertIn("follow_reference_trim_38_1", one)

    def test_unrelated_capabilities_preserve_graph_and_params(self):
        for field, value in (("kind", "tool"), ("outputType", "image"), ("id", "another_video_tool")):
            cap = self.cap(self.capabilities[0])
            cap[field] = value
            params = {"seed": 42, "output_width": 999}
            with mock.patch.object(controller_app, "probe_video", return_value={"has_audio": True}):
                with mock.patch.object(controller_app, "resolve_reference_video_output_settings", return_value=None):
                    baseline = controller_app.patch_graph(cap, dict(params), {"video[0]": self.ref})
                graph = controller_app.patch_graph(cap, params, {"video[0]": self.ref})
            self.assertEqual(graph, baseline)
            self.assertEqual(params["output_width"], 999)
            self.assertNotIn("output_duration", params)


class InstalledVideoNodeContractTest(unittest.TestCase):
    """执行本机节点的纯计算函数；不导入模型依赖，也不执行图内采样。"""
    def load_function(self, relative, name, namespace, class_name=None):
        path = ROOT.parent / "ComfyUI" / relative
        if not path.is_file():
            self.skipTest(f"Local node source unavailable: {path}")
        tree = ast.parse(path.read_text(encoding="utf-8"))
        body = tree.body
        if class_name:
            body = next(node.body for node in body if isinstance(node, ast.ClassDef) and node.name == class_name)
        function = next(node for node in body if isinstance(node, ast.FunctionDef) and node.name == name)
        function.decorator_list = []
        future = ast.parse("from __future__ import annotations").body[0]
        module = ast.Module(body=[future, function], type_ignores=[])
        exec(compile(module, str(path), "exec"), namespace)
        return namespace[name]

    def test_point_seven_mp_matches_installed_resolution_selector(self):
        namespace = {"math": math, "ASPECT_RATIOS": {"16:9 (Widescreen)": (16, 9)},
                     "io": mock.Mock(NodeOutput=lambda *values: values)}
        execute = self.load_function("comfy_extras/nodes_resolution.py", "execute", namespace,
                                     "ResolutionSelector")
        actual = execute(None, "16:9 (Widescreen)", 0.7, 32)
        _, _, graph = ReferenceVideoOutputTest().patch(
            "minimax_h3_ref9", params={"aspect_ratio": "16:9 (Widescreen)", "megapixels": 0.7})
        reference = next(node["inputs"] for node in graph.values()
                         if node["class_type"] == "MiniMaxH3ReferenceToVideo")
        self.assertEqual((reference["width"], reference["height"]), actual)

    def test_installed_long_plan_sampler_and_output_trim_use_rounded_source_frames(self):
        base = "custom_nodes/ComfyUI-MiniMaxH3-TimelineDirector/"
        finite_path = base + "minimax_h3_finite_segments.py"
        timeline_path = base + "minimax_h3_timeline_director.py"
        namespace = {"copy": copy, "math": math, "H3_FPS": 24, "FPS": 24,
                     "io": mock.Mock(NodeOutput=lambda *values, **kwargs: values)}
        self.load_function(timeline_path, "_require_timeline_plan", namespace)
        self.load_function(timeline_path, "_aligned_h3_length", namespace)
        self.load_function(base + "experimental_latent_guide.py", "_valid_guide_frames", namespace)
        for name in ("_synchronized_audio_assets", "_require_finite_plan", "_finite_plan_for_segment"):
            self.load_function(finite_path, name, namespace)
        prepare = self.load_function(finite_path, "_prepare_long_reference_plan", namespace)
        sample = self.load_function(finite_path, "execute", namespace, "MiniMaxH3FiniteSegmentSampler")
        trim = self.load_function(finite_path, "execute", namespace, "MiniMaxH3FiniteOutputTrim")
        builder = mock.Mock()
        builder.node.side_effect = lambda class_type, **inputs: mock.Mock(
            out=mock.Mock(side_effect=lambda index: [inputs["id"], index]))
        namespace.update(GraphBuilder=mock.Mock(return_value=builder),
                         drift_control_step_count=lambda sigmas: 8)

        class Frames:
            def __init__(self, count):
                self.shape = (count, 1, 1, 3)

            def __getitem__(self, selection):
                return Frames(len(range(*selection.indices(self.shape[0]))))

            def clone(self):
                return self

        for source_seconds, preview in ((5.013, 0), (10.019, 0), (300.013, 0),
                                        (300.013, 5), (10.019, 6.013)):
            seconds = min(source_seconds, preview) if preview > 0 else source_seconds
            with self.subTest(source_seconds=source_seconds, preview=preview):
                _, _, graph = ReferenceVideoOutputTest().patch(
                    "minimax_h3_character_transfer", {"duration": source_seconds},
                    {"duration": 7, "preview_seconds": preview})
                timeline = json.loads(graph["11"]["inputs"]["timeline_data"])
                source = {"type": "MINIMAX_H3_TIMELINE_PLAN", "timeline": timeline,
                          "generation_seconds": 7, "width": 480, "height": 352}
                finite = prepare(source, "Keep source motion", 48, True)
                n = round(seconds * 24)
                self.assertEqual(finite["target_output_frames"], n)
                builder.reset_mock()
                outputs = sample(None, None, None, None, None, finite, None, None, 42, True)
                trim_calls = [call for call in builder.node.call_args_list
                              if call.args[0] == "MiniMaxH3FiniteOutputTrim"]
                self.assertEqual(len(trim_calls), 1)
                self.assertEqual(trim_calls[0].kwargs["output_frames"], n)
                self.assertEqual(outputs[1], ["trim_auto_segment_output", 0])
                trimmed = trim(None, Frames(finite["assembled_frames_before_trim"]), None, n)
                self.assertEqual(trimmed[0].shape[0], n)
                fps = graph["23"]["inputs"]["fps"]
                self.assertTrue(1 <= fps <= 120)  # 本机 CreateVideo schema 的实际边界。
                self.assertAlmostEqual(trimmed[0].shape[0] / fps, seconds)


class FollowReferenceProbeTest(unittest.TestCase):
    def probe(self, video, following="", audio=True):
        audio_stream = "  Stream #0:0: Audio: aac, 48000 Hz, stereo\n" if audio else ""
        stderr = ("Input #0, mov, from 'reference.mov':\n"
                  "  Duration: 00:00:06.25, start: 0.000000, bitrate: 1000 kb/s\n"
                  f"{audio_stream}"
                  f"  Stream #0:1(und): Video: h264, yuv420p, {video}, 24 fps, 24 tbr\n"
                  f"{following}")
        with mock.patch.object(controller_app, "ffmpeg_bin", return_value=Path("ffmpeg")), \
             mock.patch.object(controller_app.Path, "exists", return_value=True), \
             mock.patch.object(controller_app.subprocess, "run", return_value=mock.Mock(stderr=stderr)) as run:
            info = controller_app.probe_video("chouka/reference.mov")
        self.assertEqual(run.call_args.args[0][1], "-i")
        self.assertEqual((info["fps"], info["frames"], info["duration"]), (24, 150, 6.25))
        self.assertEqual(info["has_audio"], audio)
        return info

    def test_silent_video_keeps_dimensions_without_inventing_audio(self):
        info = self.probe("1920x1080", audio=False)
        self.assertEqual((info["width"], info["height"]), (1920, 1080))
        self.assertFalse(info["has_audio"])

    def test_sar_and_rotation_display_dimensions(self):
        cases = (("1920x1080 [SAR 1:1 DAR 16:9]", "", (1920, 1080)),
                 ("720x576 [SAR 16:15 DAR 4:3]", "", (768, 576)),
                 ("720x576 [SAR 16:15 DAR 4:3]", "rotation of -90.00 degrees", (576, 768)),
                 ("1920x1080", "rotation of 90.00 degrees", (1080, 1920)),
                 ("1920x1080", "rotation of 270.00 degrees", (1080, 1920)),
                 ("1920x1080", "rotation of -270.00 degrees", (1080, 1920)),
                 ("1920x1080", "rotation of 180.00 degrees", (1920, 1080)),
                 ("1920x1080", "rotate : 270", (1080, 1920)),
                 ("1920x1080 [SAR 0:1 DAR 16:9]", "rotate : 0", (1920, 1080)))
        for video, rotation, expected in cases:
            with self.subTest(video=video, rotation=rotation):
                info = self.probe(video, f"    Side data:\n      {rotation}\n")
                self.assertEqual((info["width"], info["height"]), expected)

    def test_first_video_stream_only_and_displaymatrix_precedes_legacy_rotate(self):
        info = self.probe("720x576 [SAR 16:15 DAR 4:3]", (
            "    Metadata:\n      rotate : 180\n"
            "    Side data:\n      displaymatrix: rotation of 90.00 degrees\n"
            "  Stream #0:2: Video: h264, yuv420p, 4096x2160, 60 fps\n"
            "    Side data:\n      displaymatrix: rotation of 180.00 degrees\n"))
        self.assertEqual((info["width"], info["height"]), (576, 768))

    def test_codec_hex_tag_is_not_mistaken_for_dimensions(self):
        info = self.probe("(avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9]")
        self.assertEqual((info["width"], info["height"]), (1920, 1080))

    def test_missing_dimensions_does_not_guess(self):
        info = self.probe("unknown dimensions")
        self.assertNotIn("width", info)
        self.assertNotIn("height", info)


class FollowReferenceGenerateTest(unittest.IsolatedAsyncioTestCase):
    """直接调用 handler，授权/资源层均 mock，不打开端口或数据库。"""
    async def asyncSetUp(self):
        self.cap = json.loads((ROOT / "manifests/minimax_h3_ref_2pass.json").read_text(encoding="utf-8"))
        self.cap["_graph_ok"] = True
        self.ref = "chouka/reference.mp4"
        self.info = {"width": 1000, "height": 733, "duration": 6.25, "has_audio": False}
        self.body = {"project": "p", "capability": self.cap["id"],
                     "params": {"aspect_ratio": "21:9 (Ultrawide)", "duration": 4.1, "seed": 42},
                     "assets": {"video[0]": self.ref}, "video_metadata": {"duration": 1}}
        self.store = mock.Mock()
        self.request = mock.Mock(app={"distributed": self.store,
                                      "project_repository": mock.Mock(read=mock.Mock(return_value={"cards": []}))})
        replacements = {
            "authorized_body": mock.AsyncMock(return_value=self.body),
            "generation_assets": mock.AsyncMock(return_value=self.body["assets"]),
            "probe_video": mock.Mock(side_effect=lambda ref: dict(self.info)),
            "require_project": mock.AsyncMock(), "require_user": mock.Mock(return_value={"id": "u"}),
            "call_store": mock.AsyncMock(), "resource_call": mock.AsyncMock(), "save_jobs": mock.Mock(),
            "CONTROLLER_MODE": True, "CAPS": {self.cap["id"]: self.cap},
            "JOBS": {}, "STEPS": {}, "WEIGHTS": {},
        }
        for name, replacement in replacements.items():
            patcher = mock.patch.object(controller_app, name, replacement)
            patcher.start()
            self.addCleanup(patcher.stop)

    async def test_bf16_1080p_real_handler_dry_run_dispatch_and_capacity_contract(self):
        cid = "minimax_h3_ref_2pass_bf16"
        cap = json.loads((ROOT / "manifests" / f"{cid}.json").read_text(encoding="utf-8"))
        cap["_graph_ok"] = True
        controller_app.CAPS[cid] = cap
        self.body["capability"] = cid
        ledger = mock.Mock()
        ledger.dimensions.side_effect = lambda *args: controller_app.CostLedger.dimensions(None, *args)
        self.request.app["costs"] = ledger
        for reference in (False, True):
            self.body["assets"] = {"video[0]": self.ref} if reference else {}
            controller_app.generation_assets.return_value = self.body["assets"]
            for scale in (1, 1.25, 1.5, 2):
                final = tuple(round(v * scale / 2) * 2 for v in (1080, 1920))
                for dry_run in (True, False):
                    with self.subTest(reference=reference, scale=scale, dry_run=dry_run):
                        self.store.reset_mock()
                        self.body["dry_run"] = dry_run
                        self.body["params"] = {"output_1080p": "on", "duration": 4.1, "seed": 42,
                                               "aspect_ratio": "9:16 (Portrait Widescreen)", "scale_by": scale,
                                               "output_width": 16, "output_height": 16}
                        response = await controller_app.api_generate(self.request)
                        self.assertEqual(response.status, 200)
                        if dry_run:
                            changes = json.loads(response.text)["changed"]
                            self.assertEqual(changes["#186.width"][1], 1088)
                            self.assertEqual(changes["#186.height"][1], 1920)
                            self.store.enqueue.assert_not_called()
                            continue
                        payload = self.store.enqueue.call_args.args[1]
                        self.assertEqual(payload["assets"], self.body["assets"])
                        self.assertEqual(payload["duration_seconds"], 4.1)
                        expected = payload["capacity_spec"]["expected"]
                        self.assertEqual((expected["width"], expected["height"]), final)
                        self.assertEqual(expected["count"], 1)
                        dims = payload["capacity_spec"]["dimensions"]
                        self.assertEqual((dims["width"], dims["height"]), final)
                        self.assertEqual(dims["megapixels"], 1088 * 1920 / 1024 ** 2)
                        self.assertIn("ImageScale", self.store.enqueue.call_args.args[2])
                        self.assertEqual(payload["gpu_policy"], controller_app.HIGH_VRAM_GPU_POLICY)
                        if reference:
                            self.assertEqual(expected["duration"], 4.1)
                            self.assertAlmostEqual(expected["fps"], round(4.1 * 24) / 4.1)
                        else:
                            self.assertEqual(payload["graph"]["186"]["inputs"]["length"], ["131", 1])
                            self.assertEqual(payload["graph"]["225"]["inputs"]["frame_rate"], 24)

    async def test_dispatch_duration_uses_current_params_not_reference_duration(self):
        for seconds in (4.013, 6.25, 19):
            with self.subTest(seconds=seconds):
                self.info["duration"] = seconds
                response = await controller_app.api_generate(self.request)
                self.assertEqual(response.status, 200)
                payload = self.store.enqueue.call_args.args[1]
                self.assertEqual(payload["duration_seconds"], 4.1)
                self.assertEqual(payload["graph"]["132"]["inputs"]["value"], 4.1)
                self.assertEqual(payload["capacity_spec"]["expected"]["duration"], 4.1)
                self.assertEqual(payload["gpu_policy"], controller_app.HIGH_VRAM_GPU_POLICY)
        self.assertEqual(controller_app.probe_video.call_count, 3)

    async def test_dry_run_probes_same_metadata_and_never_dispatches(self):
        self.body["dry_run"] = True
        response = await controller_app.api_generate(self.request)
        changes = json.loads(response.text)["changed"]
        self.assertEqual(changes["#132.value"][1], 4.1)
        self.assertTrue(any("follow_reference_trim" in key for key in changes))
        controller_app.probe_video.assert_called_once_with(self.ref)
        self.store.enqueue.assert_not_called()
        controller_app.call_store.assert_not_awaited()

    async def test_dry_run_accepts_missing_source_dimensions_and_preserves_edits(self):
        self.body["dry_run"] = True
        self.info.pop("width")
        self.info["height"] = float("nan")
        response = await controller_app.api_generate(self.request)
        self.assertEqual(response.status, 200)
        self.assertEqual(self.body["params"]["duration"], 4.1)
        self.assertEqual(self.body["params"]["aspect_ratio"], "21:9 (Ultrawide)")
        controller_app.probe_video.assert_called_once_with(self.ref)
        self.store.enqueue.assert_not_called()

    async def test_dry_run_still_requires_trusted_imported_video_duration(self):
        self.body["dry_run"] = True
        self.info.pop("duration")
        with self.assertRaises(web.HTTPBadRequest):
            await controller_app.api_generate(self.request)
        self.store.enqueue.assert_not_called()


if __name__ == "__main__":
    unittest.main()
