"""Edit HTTP regressions: real make_app, authentication, ACLs and export manager.

Media probing/render execution is normally replaced; the one-frame regression
uses real CPU FFmpeg to generate/probe isolated media. Commit-cleanup regressions
also inject deliberate atomic-write/notification faults; cross-instance route
tests inject the typed manager-busy exception. All projects, media, auth,
dispatch and billing databases live under AuthFixture's temporary ROOT.
No ComfyUI connection, GPU, frontend or real project is used. Contract failures
remain ordinary assertions, not xfails.
"""
import asyncio
import copy
import io
import json
import subprocess
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

import aiohttp
from aiohttp import web

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "tests"))

import app as controller_app
import auth_support
from server.edit_api import EditApi, empty_edit
from server.edit_export import ExportBusyError
from test_director import ObservedLock, changed, director, shot

try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except (ImportError, RuntimeError):
    FFMPEG = None


def clip(asset="video", cid="clip-1", **fields):
    return {"id": cid, "asset": asset, "in": 0, "out": 2,
            "speed": 1, "volume": 1, "fit": "contain", **fields}


def audio(asset="music", cid="audio-1", **fields):
    return {"id": cid, "asset": asset, "in": 0, "out": 2,
            "start": 0, "volume": 1, **fields}


def caption(cid="text-1", **fields):
    return {"id": cid, "text": "城市日出\n第二行", "start": 0, "end": 2,
            "x": 0.5, "y": 0.9, "size": 32, "color": "#FFFFFF", **fields}


class EditApiTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    async def asyncSetUp(self):
        self.auth_setup()
        self.addCleanup(self.auth_teardown)
        for patcher in (
            mock.patch.object(controller_app, "ROOT", self.root),
            mock.patch.object(controller_app, "PROJ_DIR", self.root / "data" / "projects"),
            mock.patch.object(controller_app, "ARTIFACT_DIR", self.root / "data" / "artifacts"),
            mock.patch.object(controller_app, "COMFY_INPUT", self.root / "comfy-input"),
            mock.patch.object(controller_app, "JOBS", {}),
            mock.patch.object(controller_app, "CAPS", {}),
            mock.patch.object(controller_app, "CONTROLLER_MODE", False),
            mock.patch.object(controller_app, "load_caps", return_value=0),
            mock.patch.object(controller_app, "load_jobs"),
            mock.patch.object(controller_app, "lan_ips", return_value=[]),
            mock.patch.dict(controller_app.os.environ, {
                "CHOUKA_LOCAL_TEST": "0", "CHOUKA_AUTH_ORIGIN": "",
            }),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        with redirect_stdout(io.StringIO()):
            self.application = controller_app.make_app(auth_path=self.root / "data" / "auth.db")
        # Skip migrations/background ComfyUI startup, but retain real shutdown,
        # including edit_exports.close(). Forbid all upstream HTTP at the source.
        self.application.on_startup.clear()
        self.application["auth_store"] = self.auth
        self.application["resource_access"] = self.access
        trace = aiohttp.TraceConfig()

        async def forbid_upstream(session, context, params):
            raise AssertionError("Edit HTTP tests must not contact upstream: " + str(params.url))

        trace.on_request_start.append(forbid_upstream)
        self.application["session"] = aiohttp.ClientSession(trace_configs=[trace])
        self.addAsyncCleanup(self.application["session"].close)
        pricing = self.root / "pricing.json"
        pricing.write_text(json.dumps({"version": "test", "rates": {}}), encoding="utf-8")
        self.ledger = controller_app.CostLedger(self.root / "data" / "control.db", pricing)
        self.dispatch = controller_app.DistributedStore(self.root / "data" / "dispatch.db")
        self.application["costs"] = self.ledger
        self.application["distributed"] = self.dispatch
        self.manager = self.application["edit_exports"]
        self.addAsyncCleanup(self.manager.close)
        self.own_project("p")
        self.project_path = self.root / "data" / "projects" / "p.json"
        self.url = "/api/projects/p/edit"
        await self.start_client(self.application)
        self.client.session._timeout = aiohttp.ClientTimeout(total=10)
        self.addAsyncCleanup(self.client.close)

    def read_project(self):
        return json.loads(self.project_path.read_text(encoding="utf-8"))

    def seed_project(self, **fields):
        project = self.read_project()
        project.update(copy.deepcopy(fields))
        self.project_path.write_text(json.dumps(project, ensure_ascii=False), encoding="utf-8")
        return project

    def seed_edit(self, with_clips=True):
        edit = empty_edit()
        for aid, name, kind in (("video", "video.mp4", "video"),
                                ("image", "image.png", "image"),
                                ("music", "music.wav", "audio")):
            self.access.register("p", "upload", name, external=True)
            path = self.access.local_path("upload", name)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(("isolated " + kind).encode())
            edit["assets"][aid] = {
                "kind": kind, "url": "/api/upload/" + name, "ref": "chouka/" + name,
                "filename": name, "duration": 10 if kind != "image" else 5,
                "width": 0 if kind == "audio" else 96,
                "height": 0 if kind == "audio" else 64, "has_audio": kind != "image",
            }
        if with_clips:
            edit["clips"] = [clip()]
        self.seed_project(edit=edit)
        return edit

    async def get_edit(self):
        response = await self.client.get(self.url)
        self.assertEqual(response.status, 200, await response.text())
        return (await response.json())["edit"]

    async def save(self, document, expected=200, **kwargs):
        response = await self.client.put(self.url, json=document, **kwargs)
        self.assertEqual(response.status, expected, await response.text())
        return response

    async def assert_rejected(self, document, status=400, **kwargs):
        before = self.project_path.read_bytes()
        response = await self.save(document, status, **kwargs)
        self.assertEqual(self.project_path.read_bytes(), before, "Rejected edit must not write project")
        return response

    async def switch_user(self, name):
        self.headers = await self.login(name)
        self.client.session.headers.update(self.headers)

    def probe(self, error=None):
        result = {"duration": 5, "width": 96, "height": 64, "has_audio": True}
        def fail(*args):
            # HTTP exceptions are also Response instances; never reuse one after
            # aiohttp has sent it, or the second request cannot receive its body.
            if isinstance(error, web.HTTPException):
                raise type(error)(text=error.text)
            raise error

        patcher = mock.patch.object(EditApi, "metadata", new_callable=mock.AsyncMock,
                                    return_value=result, side_effect=fail if error else None)
        probe = patcher.start()
        self.addCleanup(patcher.stop)
        return probe

    @staticmethod
    def multipart(parts):
        form = aiohttp.FormData()
        for name, value, filename in parts:
            if filename is None:
                form.add_field(name, value, content_type="text/plain")
            else:
                form.add_field(name, value, filename=filename,
                               content_type="application/octet-stream")
        return form

    async def upload(self, rev=0, filename="camera.mp4", content=b"isolated media", expected=200):
        response = await self.client.post(self.url + "/upload", data=self.multipart([
            ("rev", str(rev), None), ("file", content, filename),
        ]))
        self.assertEqual(response.status, expected, await response.text())
        return response

    def seed_output(self, pid="p", job="history-job", name="result.mp4", kind="video"):
        self.register_job(job, pid)
        locator = job + "/" + name
        self.access.register(pid, "artifact", locator)
        path = self.access.local_path("artifact", locator)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"original historical output")
        output = {"kind": kind, "url": "/api/artifact/" + locator, "filename": name}
        source = {"shot": "shot-1", "card": "card-1", "job": job, "index": 0}
        if pid == "p":
            self.seed_project(director=director([shot()], rev=7), cards=[{
                "id": "card-1", "director_shot": "shot-1", "director_stage": kind,
                "job": job, "history": [{"job": job, "outputs": [copy.deepcopy(output)]}],
                "outputs": [copy.deepcopy(output)], "director_selected": {"job": job, "index": 0},
            }])
        return output, source, path

    async def import_output(self, body, expected=200):
        before = self.project_path.read_bytes()
        files = set((self.root / "data" / "uploads").glob("edit_*"))
        response = await self.client.post(self.url + "/import", json=body)
        self.assertEqual(response.status, expected, await response.text())
        if expected != 200:
            self.assertEqual(self.project_path.read_bytes(), before)
            self.assertEqual(set((self.root / "data" / "uploads").glob("edit_*")), files)
        return response

    async def start_export(self, rev=0, expected=202):
        response = await self.client.post(self.url + "/exports", json={"rev": rev})
        self.assertEqual(response.status, expected, await response.text())
        return (await response.json())["export"] if expected == 202 else response

    async def finish(self, eid):
        task = self.manager.tasks.get(eid)
        if task:
            await asyncio.wait_for(asyncio.shield(task), 5)
        return self.manager.get("p", eid)

    def render(self, entered=None, release=None, error=None):
        async def execute(record, executable, directory, sources):
            self.assertEqual(set(sources), {c["asset"] for c in record["snapshot"]["clips"]})
            self.assertTrue(all(path.is_relative_to(self.root) for path in sources.values()))
            if entered:
                entered.set()
            if release:
                await release.wait()
            if error:
                raise error
            destination = self.manager.artifacts / record["id"]
            destination.mkdir(parents=True, exist_ok=True)
            temporary = destination / "film.part.mp4"
            temporary.write_bytes(b"isolated rendered mp4")
            return temporary

        for patcher in (mock.patch.object(self.manager, "ffmpeg_bin", return_value=sys.executable),
                        mock.patch.object(self.manager, "_render", side_effect=execute)):
            patcher.start()
            self.addCleanup(patcher.stop)

    def generation_state(self):
        return {
            "cache": copy.deepcopy(controller_app.JOBS),
            "jobs": self.auth.list_project_jobs("p"),
            "billing": [tuple(row) for row in self.ledger.db.execute("SELECT * FROM cost_events ORDER BY job_id")],
            "dispatch": [tuple(row) for row in self.dispatch.db.execute("SELECT * FROM dispatch_jobs ORDER BY job_id")],
        }

    async def test_get_defaults_does_not_write_or_bill(self):
        before, generation = self.project_path.read_bytes(), self.generation_state()
        response = await self.client.get(self.url)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.json(), {"edit": empty_edit(), "exports": []})
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(self.generation_state(), generation)
        self.assertFalse(self.manager.closed)

    async def test_save_changes_only_edit_and_updated_with_independent_revision(self):
        before = self.seed_project(rev=17, director=director([shot()], rev=8),
                                   cards=[{"id": "card-1", "params": {"seed": 42}}],
                                   edges=[{"from": "card-1", "to": "card-1"}],
                                   groups=[{"id": "group-1"}], view={"x": 3, "y": 4, "k": 1.5},
                                   created=123, updated=1, custom={"preserve": True})
        response = await self.save(empty_edit())
        self.assertEqual((await response.json())["edit"], {**empty_edit(), "rev": 1})
        after = self.read_project()
        self.assertGreater(after["updated"], 1)
        self.assertEqual({k: v for k, v in after.items() if k not in ("edit", "updated")},
                         {k: v for k, v in before.items() if k != "updated"})
        self.assertEqual(await self.get_edit(), after["edit"])

    async def test_canvas_and_director_saves_cannot_overwrite_edit(self):
        self.seed_project(rev=8, cards=[{"id": "card-1", "title": "旧标题"}],
                          director=director([shot()], rev=3))
        await self.save(empty_edit())
        edit = await self.get_edit()
        response = await self.client.put("/api/projects/p", json={
            "rev": 8, "cards": [{"id": "card-1", "title": "新标题"}],
            "edges": [], "edit": empty_edit(), "director": director(),
        })
        self.assertEqual(response.status, 200, await response.text())
        response = await self.client.put("/api/projects/p/director", json={
            **director([shot()], rev=3), "script": "独立导演稿",
        })
        self.assertEqual(response.status, 200, await response.text())
        await self.save({**edit, "ratio": "9:16"})
        project = self.read_project()
        self.assertEqual((project["rev"], project["director"]["rev"], project["edit"]["rev"]), (9, 4, 2))
        self.assertEqual(project["cards"][0]["title"], "新标题")
        self.assertEqual(project["director"]["script"], "独立导演稿")

    async def test_stale_revision_precedes_asset_registry_mismatch(self):
        edit = self.seed_edit()
        await self.save(edit)
        for rev in (0, 2, 99):
            with self.subTest(rev=rev):
                response = await self.assert_rejected({**edit, "rev": rev, "assets": {}}, 409)
                self.assertIn("重新加载", await response.text())
        await self.save({**edit, "rev": 1})
        self.assertEqual(self.read_project()["edit"]["rev"], 2)

    async def test_asset_registry_cannot_be_added_deleted_or_rewritten_by_put(self):
        edit = self.seed_edit()
        cases = [changed(edit, ("assets",), {}),
                 changed(edit, ("assets", "new-asset"), edit["assets"]["video"])]
        for field, value in (("url", "/api/upload/image.png"), ("ref", "chouka/image.png"),
                             ("filename", "renamed.mp4"), ("duration", 999),
                             ("kind", "image"), ("has_audio", False),
                             ("source", {"job": "forged"})):
            cases.append(changed(edit, ("assets", "video", field), value))
        for document in cases:
            with self.subTest(assets=document["assets"]):
                await self.assert_rejected(document)

    async def queued_writes(self, requests):
        lock = ObservedLock()
        self.application["project_locks"]["p"] = lock
        await lock.acquire()
        tasks = [asyncio.create_task(request()) for request in requests]
        try:
            await asyncio.wait_for(lock.both_waiting.wait(), 5)
            lock.release()
            return await asyncio.wait_for(asyncio.gather(*tasks), 5)
        finally:
            if lock.locked() and not lock.both_waiting.is_set():
                lock.release()
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)

    async def test_concurrent_same_rev_has_one_winner(self):
        documents = [{**empty_edit(), "ratio": ratio} for ratio in ("9:16", "1:1")]
        responses = await self.queued_writes([
            lambda document=document: self.client.put(self.url, json=document)
            for document in documents
        ])
        self.assertEqual(sorted(r.status for r in responses), [200, 409])
        winner = next(i for i, response in enumerate(responses) if response.status == 200)
        self.assertEqual(await self.get_edit(), {**documents[winner], "rev": 1})
        self.assertEqual(self.read_project()["rev"], 0)

    async def test_concurrent_canvas_and_edit_preserve_both(self):
        responses = await self.queued_writes([
            lambda: self.client.put(self.url, json={**empty_edit(), "ratio": "1:1"}),
            lambda: self.client.put("/api/projects/p", json={"rev": 0, "cards": [], "edges": []}),
        ])
        for response in responses:
            self.assertEqual(response.status, 200, await response.text())
        project = self.read_project()
        self.assertEqual(project["rev"], 1)
        self.assertEqual(project["edit"], {**empty_edit(), "ratio": "1:1", "rev": 1})

    async def test_malformed_json_and_strict_top_level_schema(self):
        before = self.project_path.read_bytes()
        response = await self.client.put(self.url, data='{"rev":',
                                         headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)
        valid = empty_edit()
        cases = [None, [], "edit", {**valid, "extra": True}]
        for key in valid:
            missing = copy.deepcopy(valid)
            missing.pop(key)
            cases.append(missing)
        for key, values in {
            "rev": [True, False, -1, 0.5, "0", None],
            "ratio": [None, [], {}, "4:3", 16],
            "resolution": [True, 720.0, "720", 480, None],
            "fps": [True, 30.0, "30", 60, None], "assets": [None, [], "assets"],
            "clips": [None, {}, "clips"], "audio": [None, {}, "audio"],
            "texts": [None, {}, "texts"],
        }.items():
            cases.extend(changed(valid, (key,), value) for value in values)
        for document in cases:
            with self.subTest(document=document):
                await self.assert_rejected(document)

    async def test_strict_items_ids_and_cross_track_uniqueness(self):
        valid = self.seed_edit()
        valid.update(audio=[audio()], texts=[caption()])
        for track in ("clips", "audio", "texts"):
            items = [None, [], "item", {**valid[track][0], "extra": True}]
            for key in valid[track][0]:
                missing = copy.deepcopy(valid[track][0])
                missing.pop(key)
                items.append(missing)
            for item in items:
                with self.subTest(track=track, item=item):
                    await self.assert_rejected(changed(valid, (track, 0), item))
            for invalid in ("", "a/b", "a.b", "a b", "a\\b", "x" * 129, 1, None):
                with self.subTest(track=track, id=invalid):
                    await self.assert_rejected(changed(valid, (track, 0, "id"), invalid))
        await self.assert_rejected(changed(valid, ("audio", 0, "id"), "clip-1"))
        await self.assert_rejected(changed(valid, ("texts", 0, "id"), "audio-1"))
        await self.assert_rejected(changed(valid, ("clips",), [clip(), clip()]))

    async def test_video_speed_exact_boundaries_and_image_speed_one(self):
        edit = self.seed_edit()
        for speed in (0.25, 4):
            edit["clips"] = [clip(speed=speed, fit="cover")]
            response = await self.save(edit)
            edit = (await response.json())["edit"]
            self.assertEqual(edit["clips"][0]["speed"], speed)
        for speed in (0.249, 4.001, 0, -1, True, "1", None, float("nan"), float("inf")):
            with self.subTest(speed=repr(speed)):
                await self.assert_rejected(changed(edit, ("clips", 0, "speed"), speed))
        edit["clips"] = [clip("image", out=30)]
        edit = (await (await self.save(edit)).json())["edit"]
        for speed in (0.25, 2, 4):
            await self.assert_rejected(changed(edit, ("clips", 0, "speed"), speed))
        await self.assert_rejected(changed(edit, ("clips", 0, "in"), 1))

    async def test_clip_intervals_volume_fit_and_asset_kinds(self):
        edit = self.seed_edit()
        for field, values in {
            "asset": ["missing", "music", "../video", [], None],
            "in": [-1, True, "0", float("nan"), float("inf")],
            "out": [0, 0.01, 10.01, 3601, True, "2", float("inf")],
            "volume": [-0.01, 2.01, True, "1", float("nan")],
            "fit": ["stretch", None, [], 1],
        }.items():
            for value in values:
                with self.subTest(field=field, value=repr(value)):
                    await self.assert_rejected(changed(edit, ("clips", 0, field), value))
        for volume in (0, 2):
            edit["clips"] = [clip(out=1 / 30, volume=volume)]
            edit = (await (await self.save(edit)).json())["edit"]

    async def test_audio_overlap_rejected_adjacent_and_unsorted_allowed(self):
        edit = self.seed_edit()
        edit["audio"] = [audio(cid="late", start=2), audio(cid="early", start=0)]
        edit = (await (await self.save(edit)).json())["edit"]
        await self.assert_rejected(changed(edit, ("audio", 0, "start"), 1.99))
        for field, value in (("asset", "video"), ("asset", "image"), ("start", -1),
                             ("start", True), ("start", 3601), ("out", 11),
                             ("volume", 2.01), ("in", 2)):
            with self.subTest(field=field, value=value):
                await self.assert_rejected(changed(edit, ("audio", 0, field), value))
        await self.assert_rejected(changed(edit, ("audio", 0, "speed"), 1))

    async def test_saved_adjacent_fractional_audio_can_start_export_without_false_overlap(self):
        edit = self.seed_edit()
        generation = self.generation_state()
        self.assertGreater(0.1 + 0.2, 0.3)  # Explicitly exercise binary rounding.
        edit["audio"] = [audio(cid="early", start=0.1, out=0.2),
                         audio(cid="late", start=0.3, out=0.2)]
        saved = (await (await self.save(edit)).json())["edit"]
        self.assertEqual(saved["audio"], edit["audio"])
        self.assertEqual(await self.get_edit(), saved)
        # Real manager.start validation must match the successful HTTP save.
        # Hold execution so no synthetic fixture media reaches FFmpeg rendering.
        await self.manager.slots.acquire()
        exported = await self.start_export(rev=saved["rev"])
        self.assertEqual(exported["edit_rev"], saved["rev"])
        self.assertEqual(self.manager.records[exported["id"]]["snapshot"], saved)
        response = await self.client.post(self.url + f'/exports/{exported["id"]}/cancel')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.generation_state(), generation)

    async def test_text_content_time_and_style_limits(self):
        edit = self.seed_edit()
        edit["texts"] = [caption(text="字" * 2000, x=0, y=1, size=96, color="#aBc123")]
        edit = (await (await self.save(edit)).json())["edit"]
        for field, values in {
            "text": ["", "字" * 2001, "bad\x00text", "bad\x1ftext", None, 123],
            "start": [-1, True, "0", float("nan"), 2],
            "end": [0, -1, True, 3601, float("inf")],
            "x": [-0.01, 1.01, True, "0.5"], "y": [-0.01, 1.01, None],
            "size": [15.99, 96.01, True, "32"],
            "color": ["white", "#fff", "#gggggg", None, []],
        }.items():
            for value in values:
                with self.subTest(field=field, value=str(value)[:60]):
                    await self.assert_rejected(changed(edit, ("texts", 0, field), value))
        edit["texts"] = [caption(text="换行\n回车\r制表\t", size=16, start=3599, end=3600)]
        await self.save(edit)

    async def test_track_count_and_total_duration_limits(self):
        edit = self.seed_edit()
        for track, items in (
            ("clips", [clip(cid=f"c-{i}", out=1 / 30) for i in range(201)]),
            ("audio", [audio(cid=f"a-{i}", out=1 / 30, start=i) for i in range(201)]),
            ("texts", [caption(cid=f"t-{i}") for i in range(201)]),
        ):
            await self.assert_rejected(changed(edit, (track,), items))
            edit[track] = items[:200]
            edit = (await (await self.save(edit)).json())["edit"]
        edit.update(audio=[], texts=[], clips=[clip("image", out=3600)])
        edit = (await (await self.save(edit)).json())["edit"]
        await self.assert_rejected(changed(edit, ("clips",), edit["clips"] + [clip("image", "extra", out=1 / 30)]))

    async def test_upload_registers_server_asset_and_no_generation_billing(self):
        self.probe()
        before = self.seed_project(rev=12, director=director([shot()], rev=5))
        generation = self.generation_state()
        for kind, name in (("video", "camera.mp4"), ("image", "still.png"), ("audio", "music.wav")):
            response = await self.upload(rev=(await self.get_edit())["rev"], filename=name)
            payload = await response.json()
            asset = payload["asset"]
            self.assertEqual(asset["kind"], kind)
            self.assertEqual(asset["filename"], name)
            self.assertNotEqual(asset["url"], "/api/upload/" + name)
            resource = self.access.reference(asset["url"])
            self.assertTrue(self.access.authorize(self.admin["id"], *resource, project_id="p"))
            self.assertTrue(self.access.lookup(*resource)["external"])
            self.assertEqual(self.access.local_path(*resource).read_bytes(), b"isolated media")
            self.assertEqual(payload["edit"]["assets"][asset["id"]],
                             {k: v for k, v in asset.items() if k != "id"})
        self.assertEqual(self.read_project()["rev"], before["rev"])
        self.assertEqual(self.read_project()["director"], before["director"])
        self.assertEqual(self.read_project()["edit"]["rev"], 3)
        self.assertEqual(self.generation_state(), generation)

    @unittest.skipUnless(FFMPEG, "imageio CPU FFmpeg is not installed")
    async def test_real_one_frame_h264_upload_metadata_and_default_trim(self):
        fixture = self.root / "one-frame.mp4"
        generated = await asyncio.to_thread(subprocess.run, [
            FFMPEG, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
            "-filter_threads", "2", "-filter_complex_threads", "2",
            "-f", "lavfi", "-i", "color=red:size=64x64:rate=30",
            "-frames:v", "1", "-an", "-c:v", "libx264", "-threads", "2",
            "-pix_fmt", "yuv420p", "-r", "30", "-video_track_timescale", "30000",
            str(fixture),
        ], capture_output=True, timeout=30)
        self.assertEqual(generated.returncode, 0, generated.stderr.decode(errors="replace"))
        inspected = await asyncio.to_thread(subprocess.run, [
            FFMPEG, "-nostdin", "-hide_banner", "-protocol_whitelist", "file,pipe",
            "-i", str(fixture),
        ], capture_output=True, timeout=30)
        banner = inspected.stderr.decode(errors="replace")
        self.assertIn("Duration: 00:00:00.03", banner)
        self.assertRegex(banner, r"Video: h264.*64x64.*30 fps")
        frames, _ = await asyncio.to_thread(imageio_ffmpeg.count_frames_and_secs, str(fixture))
        self.assertEqual(frames, 1)
        generation = self.generation_state()
        # Keep the actual metadata subprocess and HTTP upload implementation;
        # only point the executable resolver at the fixture's CPU FFmpeg.
        with mock.patch.object(controller_app, "ffmpeg_bin", return_value=FFMPEG):
            payload = await (await self.upload(filename=fixture.name, content=fixture.read_bytes())).json()
        asset = payload["asset"]
        self.assertEqual((asset["kind"], asset["width"], asset["height"], asset["has_audio"]),
                         ("video", 64, 64, False))
        self.assertEqual(asset["duration"], 1 / 30)
        self.assertEqual(await self.get_edit(), payload["edit"])
        resource = self.access.reference(asset["url"])
        self.assertEqual(self.access.local_path(*resource).read_bytes(), fixture.read_bytes())
        edit = payload["edit"]
        # Initial trim for a short video is its full duration, not rounded 0.03.
        edit["clips"] = [clip(asset["id"], out=min(5, asset["duration"]))]
        saved = (await (await self.save(edit)).json())["edit"]
        self.assertEqual(saved["clips"][0]["out"], 1 / 30)
        self.assertEqual(saved["rev"], 2)
        await self.manager.slots.acquire()
        exported = await self.start_export(rev=saved["rev"])
        self.assertEqual(exported["duration"], 1 / 30)
        response = await self.client.post(self.url + f'/exports/{exported["id"]}/cancel')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.generation_state(), generation)

    async def test_real_metadata_parser_and_restricted_ffmpeg_arguments(self):
        # Replace subprocess execution, not EditApi.metadata or its validation.
        for filename, stderr, kind, duration, dimensions, has_audio in (
            ("camera.mp4", "Duration: 00:00:05.00\n Stream #0:0: Video: h264, yuv420p, 96x64\n Stream #0:1: Audio: aac",
             "video", 5, (96, 64), True),
            ("still.png", "Duration: N/A\n Stream #0:0: Video: png, rgb24, 96x64",
             "image", 5, (96, 64), False),
            ("music.wav", "Duration: 00:00:03.50\n Stream #0:0: Audio: pcm_s16le",
             "audio", 3.5, (0, 0), True),
        ):
            with self.subTest(filename=filename):
                process = mock.Mock(returncode=1)
                process.communicate = mock.AsyncMock(return_value=(b"", stderr.encode()))
                with mock.patch.object(controller_app, "ffmpeg_bin", return_value=sys.executable), \
                        mock.patch("server.edit_api.asyncio.create_subprocess_exec",
                                   new_callable=mock.AsyncMock, return_value=process) as spawn:
                    response = await self.upload(rev=(await self.get_edit())["rev"], filename=filename)
                asset = (await response.json())["asset"]
                self.assertEqual((asset["kind"], asset["duration"], asset["width"], asset["height"], asset["has_audio"]),
                                 (kind, duration, *dimensions, has_audio))
                arguments = spawn.call_args.args
                self.assertEqual(arguments[arguments.index("-protocol_whitelist") + 1], "file,pipe")
                formats = arguments[arguments.index("-format_whitelist") + 1].split(",")
                self.assertNotIn("hls", formats)
                self.assertNotIn("concat", formats)
                self.assertLess(arguments.index("-format_whitelist"), arguments.index("-i"))
                self.assertTrue(Path(arguments[arguments.index("-i") + 1]).is_relative_to(self.root))

    async def test_real_metadata_rejects_invalid_duration_or_missing_media_streams(self):
        before = self.project_path.read_bytes()
        for filename, stderr in (
            ("a.mp4", "Duration: 00:00:00.01\n Video: h264, 96x64"),
            ("a.mp4", "Duration: 01:00:00.01\n Video: h264, 96x64"),
            ("a.mp4", "Duration: N/A\n Video: h264, 96x64"),
            ("a.mp4", "Duration: 00:00:05.00\n Stream #0:0: Audio: aac"),
            ("a.wav", "Duration: 00:00:05.00\n Video: h264, 96x64"),
            ("a.png", "Duration: N/A\n unknown stream"),
        ):
            with self.subTest(filename=filename, stderr=stderr):
                process = mock.Mock(returncode=1)
                process.communicate = mock.AsyncMock(return_value=(b"", stderr.encode()))
                with mock.patch.object(controller_app, "ffmpeg_bin", return_value=sys.executable), \
                        mock.patch("server.edit_api.asyncio.create_subprocess_exec",
                                   new_callable=mock.AsyncMock, return_value=process):
                    await self.upload(filename=filename, expected=400)
                self.assertEqual(self.project_path.read_bytes(), before)
                self.assertEqual(list((self.root / "data" / "uploads").glob("edit_*")), [])

    async def test_metadata_timeout_returns_400_kills_probe_and_cleans_upload(self):
        process = mock.Mock(returncode=None)
        process.communicate = mock.AsyncMock(side_effect=[asyncio.TimeoutError(), (b"", b"")])
        before = self.project_path.read_bytes()
        with mock.patch.object(controller_app, "ffmpeg_bin", return_value=sys.executable), \
                mock.patch("server.edit_api.asyncio.create_subprocess_exec",
                           new_callable=mock.AsyncMock, return_value=process):
            response = await self.upload(expected=400)
        self.assertIn("超时", await response.text())
        process.kill.assert_called_once()
        self.assertEqual(process.communicate.await_count, 2)
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(list((self.root / "data" / "uploads").glob("edit_*")), [])

    async def test_upload_malformed_fields_empty_unknown_and_stale_cleanup(self):
        probe = self.probe()
        await self.save(empty_edit())
        cases = [
            ([("file", b"media", "camera.mp4")], 400),
            ([("rev", "1", None)], 400),
            ([("rev", "true", None), ("file", b"media", "camera.mp4")], 400),
            ([("rev", "-1", None), ("file", b"media", "camera.mp4")], 400),
            ([("rev", "1", None), ("rev", "1", None), ("file", b"media", "camera.mp4")], 400),
            ([("rev", "1", None), ("file", b"", "camera.mp4")], 400),
            ([("rev", "1", None), ("file", b"media", "script.exe")], 400),
            ([("rev", "1", None), ("file", b"one", "a.mp4"), ("file", b"two", "b.mp4")], 400),
            ([("rev", "1", None), ("file", b"media", "a.mp4"), ("extra", "x", None)], 400),
            ([("file", b"media", "a.mp4"), ("rev", "0", None)], 409),
        ]
        before = self.project_path.read_bytes()
        for parts, status in cases:
            with self.subTest(parts=[(p[0], p[2]) for p in parts]):
                response = await self.client.post(self.url + "/upload", data=self.multipart(parts))
                self.assertEqual(response.status, status, await response.text())
                self.assertEqual(self.project_path.read_bytes(), before)
                self.assertEqual(list((self.root / "data" / "uploads").glob("edit_*")), [])
        probe.assert_not_awaited()

    async def test_upload_non_multipart_is_bad_request_not_internal_error(self):
        before = self.project_path.read_bytes()
        response = await self.client.post(self.url + "/upload", json={"rev": 0, "file": "invalid"})
        error = await response.text()
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(response.status, 400, error[:200])

    async def test_malformed_multipart_returns_400_and_cleans_partial_upload(self):
        probe = self.probe()
        before = self.project_path.read_bytes()
        generation = self.generation_state()
        partial = (b'--test-boundary\r\nContent-Disposition: form-data; name="rev"\r\n\r\n0\r\n'
                   b'--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="a.mp4"\r\n'
                   b'Content-Type: video/mp4\r\n\r\ntruncated media without closing boundary')
        for content_type, body in (
            ("multipart/form-data", b"no boundary parameter"),
            ("multipart/form-data; boundary=test-boundary", b"wrong opening boundary\r\n"),
            ("multipart/form-data; boundary=test-boundary", partial),
        ):
            with self.subTest(content_type=content_type, body=body[:60]):
                response = await self.client.post(self.url + "/upload", data=body,
                                                 headers={"Content-Type": content_type})
                self.assertEqual(response.status, 400, (await response.text())[:200])
                self.assertEqual(self.project_path.read_bytes(), before)
                self.assertEqual(list((self.root / "data" / "uploads").glob("edit_*")), [])
                self.assertEqual(self.generation_state(), generation)
        probe.assert_not_awaited()

    async def test_upload_invalid_mime_part_header_is_400_without_mutation(self):
        probe = self.probe()
        before = self.project_path.read_bytes()
        generation = self.generation_state()
        valid_parts = (
            b'--test-boundary\r\nContent-Disposition: form-data; name="rev"\r\n\r\n0\r\n'
            b'--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="a.mp4"\r\n'
            b'Content-Type: video/mp4\r\n\r\nalready written media\r\n'
        )
        # Missing colon in a MIME part header raises aiohttp.InvalidHeader
        # (BadHttpMessage), rather than ValueError or AssertionError.
        invalid_part = (b'--test-boundary\r\nContent-Disposition bad\r\n\r\ninvalid part\r\n'
                        b'--test-boundary--\r\n')
        for prefix in (b"", valid_parts):
            with self.subTest(file_already_written=bool(prefix)):
                response = await self.client.post(
                    self.url + "/upload", data=prefix + invalid_part,
                    headers={"Content-Type": "multipart/form-data; boundary=test-boundary"})
                self.assertEqual(response.status, 400, (await response.text())[:200])
                self.assertEqual(self.project_path.read_bytes(), before)
                self.assertEqual(list((self.root / "data" / "uploads").iterdir()), [])
                self.assertEqual(self.generation_state(), generation)
        probe.assert_not_awaited()

    async def test_failed_media_probe_removes_upload_and_import_copy(self):
        self.probe(web.HTTPBadRequest(text="invalid media"))
        output, _, original = self.seed_output()
        before = self.project_path.read_bytes()
        await self.upload(expected=400)
        await self.import_output({"rev": 0, "output": output}, 400)
        self.assertEqual(list((self.root / "data" / "uploads").glob("edit_*")), [])
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(original.read_bytes(), b"original historical output")

    async def asset_write_failure(self, route, after_write):
        """Inject an I/O/notification fault, never replace the HTTP handler/ACL."""
        self.probe()
        output, source, original = self.seed_output()
        before = self.project_path.read_bytes()
        generation = self.generation_state()
        target = "broadcast_collaboration" if after_write else "write_project"
        exception = RuntimeError("notification failed") if after_write else OSError("atomic write failed")
        replacement = mock.AsyncMock(side_effect=exception) if after_write else mock.Mock(side_effect=exception)
        with mock.patch.object(controller_app, target, replacement):
            if route == "upload":
                response = await self.client.post(self.url + "/upload", data=self.multipart([
                    ("rev", "0", None), ("file", b"isolated uploaded bytes", "camera.mp4"),
                ]))
            else:
                response = await self.client.post(self.url + "/import", json={
                    "rev": 0, "output": output, "source": source,
                })
            self.assertEqual(response.status, 500, await response.text())
        replacement.assert_called_once()
        frozen_files = list((self.root / "data" / "uploads").glob("edit_*"))
        if after_write:
            edit = await self.get_edit()
            self.assertEqual(edit["rev"], 1)
            self.assertEqual(len(edit["assets"]), 1)
            asset = next(iter(edit["assets"].values()))
            resource = self.access.reference(asset["url"])
            saved_file = self.access.local_path(*resource)
            self.assertEqual(frozen_files, [saved_file])
            self.assertEqual(saved_file.read_bytes(), b"isolated uploaded bytes" if route == "upload"
                             else b"original historical output")
            self.assertTrue(self.access.authorize(self.admin["id"], *resource, project_id="p"))
            edit["clips"] = [clip(next(iter(edit["assets"])))]
            await self.save(edit)
        else:
            self.assertEqual(self.project_path.read_bytes(), before)
            self.assertEqual(frozen_files, [])
        self.assertEqual(original.read_bytes(), b"original historical output")
        self.assertEqual(self.generation_state(), generation)

    async def test_upload_failure_after_atomic_save_keeps_committed_asset_file(self):
        await self.asset_write_failure("upload", after_write=True)

    async def test_import_failure_after_atomic_save_keeps_committed_frozen_file(self):
        await self.asset_write_failure("import", after_write=True)

    async def test_upload_failure_before_atomic_save_cleans_uncommitted_file(self):
        await self.asset_write_failure("upload", after_write=False)

    async def test_import_failure_before_atomic_save_cleans_uncommitted_copy(self):
        await self.asset_write_failure("import", after_write=False)

    async def test_asset_capacity_rejects_upload_and_import_before_probe(self):
        probe = self.probe()
        edit = self.seed_edit(with_clips=False)
        base = edit["assets"]["video"]
        edit["assets"] = {f"a-{i}": copy.deepcopy(base) for i in range(200)}
        self.seed_project(edit=edit)
        output, _, _ = self.seed_output()
        await self.upload(expected=400)
        await self.import_output({"rev": 0, "output": output}, 400)
        probe.assert_not_awaited()
        self.assertEqual(len((await self.get_edit())["assets"]), 200)

    async def test_import_freezes_bytes_provenance_and_survives_current_selection_changes(self):
        self.probe()
        output, source, original = self.seed_output()
        before = self.read_project()
        generation = self.generation_state()
        response = await self.import_output({"rev": 0, "output": output, "source": source})
        payload = await response.json()
        asset = payload["asset"]
        resource = self.access.reference(asset["url"])
        frozen = self.access.local_path(*resource)
        self.assertNotEqual(frozen, original)
        self.assertEqual(frozen.read_bytes(), original.read_bytes())
        self.assertEqual(asset["source"], source)
        parent = self.access.lookup(*self.access.reference(output["url"]))
        self.assertEqual(self.access.lookup(*resource)["parent_id"], parent["resource_id"])
        self.assertEqual(self.read_project()["cards"], before["cards"])
        self.assertEqual(self.read_project()["director"], before["director"])
        original.write_bytes(b"later overwritten output")
        card = self.read_project()["cards"][0]
        card.update(outputs=[], director_selected={"job": "new-job", "index": 0}, history=[])
        self.seed_project(cards=[card])
        persisted = await self.get_edit()
        self.assertEqual(persisted, payload["edit"])
        self.assertEqual(frozen.read_bytes(), b"original historical output")
        await self.assert_rejected(changed(persisted, ("assets", asset["id"], "source", "job"), "new-job"))
        persisted["clips"] = [clip(asset["id"])]
        await self.save(persisted)
        self.assertEqual(self.generation_state(), generation)

    async def test_import_valid_resource_without_director_source(self):
        self.probe()
        output, _, _ = self.seed_output(name="still.png", kind="image")
        response = await self.import_output({"rev": 0, "output": output})
        asset = (await response.json())["asset"]
        self.assertEqual(asset["kind"], "image")
        self.assertNotIn("source", asset)

    async def test_import_strict_body_and_source_schema(self):
        probe = self.probe()
        output, source, _ = self.seed_output()
        valid = {"rev": 0, "output": output, "source": source}
        cases = [None, [], "import", {}, {"rev": 0}, {**valid, "extra": 1},
                 {**valid, "output": None}, {**valid, "source": None},
                 {**valid, "source": []}, changed(valid, ("output", "kind"), "file"),
                 changed(valid, ("output", "url"), None)]
        for key in source:
            missing = copy.deepcopy(valid)
            missing["source"].pop(key)
            cases.append(missing)
        cases.append(changed(valid, ("source", "extra"), True))
        for key in ("shot", "card", "job"):
            cases.extend(changed(valid, ("source", key), value)
                         for value in ("", "a/b", "x" * 129, None, 1))
        cases.extend(changed(valid, ("source", "index"), value)
                     for value in (-1, True, 0.5, "0", None))
        for body in cases:
            with self.subTest(body=str(body)[:180]):
                await self.import_output(body, 400)
        probe.assert_not_awaited()

    async def test_import_provenance_requires_same_shot_card_job_and_output_index(self):
        probe = self.probe()
        output, source, _ = self.seed_output()
        self.own_project("other")
        self.register_job("foreign-job", "other")
        valid = {"rev": 0, "output": output, "source": source}
        cases = [changed(valid, ("source", "shot"), "shot-2"),
                 changed(valid, ("source", "card"), "card-2"),
                 changed(valid, ("source", "job"), "foreign-job"),
                 changed(valid, ("source", "job"), "missing-job"),
                 changed(valid, ("source", "index"), 1),
                 changed(valid, ("output", "url"), "/api/upload/unknown.mp4"),
                 changed(valid, ("output", "kind"), "image")]
        for body in cases:
            with self.subTest(body=body):
                await self.import_output(body, 400)
        probe.assert_not_awaited()

    async def test_import_foreign_unregistered_external_and_traversal_resources(self):
        probe = self.probe()
        self.own_project("other")
        foreign, _, _ = self.seed_output("other", "foreign-job")
        await self.import_output({"rev": 0, "output": foreign}, 404)
        for url, status in (
            ("/api/upload/missing.mp4", 404), ("/unknown.mp4", 404),
            ("https://foreign.invalid/video.mp4", 400), ("//foreign.invalid/video.mp4", 400),
            ("/api/upload/../secret.mp4", 400), ("/api/upload/%2e%2e%2fsecret.mp4", 400),
            ("/api/upload/video.mp4?extra=1", 400),
        ):
            with self.subTest(url=url):
                await self.import_output({"rev": 0, "output": {"kind": "video", "url": url}}, status)
        self.assertFalse(self.access.authorize(self.admin["id"], "artifact", "foreign-job/result.mp4", "p"))
        probe.assert_not_awaited()

    async def test_import_kind_mismatch_and_stale_rev(self):
        probe = self.probe()
        output, _, _ = self.seed_output()
        await self.import_output({"rev": 0, "output": {**output, "kind": "image"}}, 400)
        await self.save(empty_edit())
        await self.import_output({"rev": 0, "output": output}, 409)
        probe.assert_not_awaited()

    async def test_export_empty_stale_and_malformed_requests_do_not_start_tasks(self):
        before = self.project_path.read_bytes()
        await self.start_export(expected=400)
        for body in (None, [], {}, {"rev": True}, {"rev": "0"}, {"rev": 0, "extra": 1}):
            response = await self.client.post(self.url + "/exports", json=body)
            self.assertEqual(response.status, 400, await response.text())
            self.assertEqual(self.project_path.read_bytes(), before)
        self.seed_edit()
        before = self.project_path.read_bytes()
        await self.start_export(rev=1, expected=409)
        self.assertEqual(self.manager.list("p"), [])
        self.assertEqual(self.manager.tasks, {})
        self.assertEqual(self.project_path.read_bytes(), before)

    async def test_export_queued_status_cancel_pending_download_and_no_billing(self):
        edit = self.seed_edit()
        generation = self.generation_state()
        before = self.project_path.read_bytes()
        await self.manager.slots.acquire()
        item = await self.start_export()
        eid = item["id"]
        self.assertEqual((item["status"], item["edit_rev"], item["duration"]), ("queued", 0, 2))
        response = await self.client.get(self.url + "/exports")
        self.assertEqual(response.status, 200)
        self.assertEqual((await response.json())["exports"], [item])
        response = await self.client.get(self.url)
        self.assertEqual((await response.json())["exports"], [item])
        self.assertNotIn("snapshot", item)
        self.assertEqual(self.manager.records[eid]["snapshot"], edit)
        self.assertEqual((await self.client.get(self.url + f"/exports/{eid}/download")).status, 409)
        response = await self.client.post(self.url + f"/exports/{eid}/cancel")
        self.assertEqual(response.status, 200, await response.text())
        canceled = (await response.json())["export"]
        self.assertEqual(canceled["status"], "canceled")
        response = await self.client.post(self.url + f"/exports/{eid}/cancel")
        self.assertEqual((await response.json())["export"]["status"], "canceled")
        self.assertEqual((await self.client.get(self.url + f"/exports/{eid}/download")).status, 409)
        self.assertFalse(self.manager.artifacts.joinpath(eid).exists())
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(self.generation_state(), generation)

    async def test_export_running_done_download_acl_and_frozen_revision(self):
        entered, release = asyncio.Event(), asyncio.Event()
        self.render(entered, release)
        edit = self.seed_edit()
        generation = self.generation_state()
        item = await self.start_export()
        eid = item["id"]
        await asyncio.wait_for(entered.wait(), 5)
        response = await self.client.get(self.url + "/exports")
        running = (await response.json())["exports"][0]
        self.assertEqual(running["status"], "running")
        self.assertGreater(running["progress"], 0)
        await self.save({**edit, "ratio": "1:1"})
        self.assertEqual(self.manager.records[eid]["snapshot"], edit)
        release.set()
        done = await self.finish(eid)
        self.assertEqual((done["status"], done["progress"], done["edit_rev"]), ("done", 1, 0))
        resource = self.access.reference(done["url"])
        self.assertTrue(self.access.authorize(self.admin["id"], *resource, project_id="p"))
        response = await self.client.get(self.url + f"/exports/{eid}/download")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(await response.read(), b"isolated rendered mp4")
        self.assertEqual(response.content_type, "video/mp4")
        self.assertEqual(response.headers["Content-Disposition"], 'attachment; filename="film.mp4"')
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        reader = self.auth.create_user("export-reader", auth_support.PASSWORD)
        self.auth.set_grant(reader["id"], self.admin["id"], "read")
        await self.switch_user("export-reader")
        self.assertEqual((await self.client.get(self.url + f"/exports/{eid}/download")).status, 200)
        self.auth.delete_grant(reader["id"], self.admin["id"])
        self.assertEqual((await self.client.get(self.url + f"/exports/{eid}/download")).status, 404)
        self.assertEqual(self.generation_state(), generation)

    async def revoke_during_render(self, missing=False):
        entered, release = asyncio.Event(), asyncio.Event()
        self.render(entered, release)
        self.seed_edit()
        generation = self.generation_state()
        item = await self.start_export()
        await asyncio.wait_for(entered.wait(), 5)
        if missing:
            self.project_path.unlink()
        else:
            self.seed_project(locked=True)
        release.set()
        state = await self.finish(item["id"])
        self.assertEqual(state["status"], "error")
        self.assertNotIn("url", state)
        self.assertFalse((self.manager.artifacts / item["id"]).exists())
        self.assertIsNone(self.access.lookup("artifact", item["id"] + "/film.mp4"))
        self.assertEqual(self.generation_state(), generation)

    async def test_project_locked_during_render_cannot_publish(self):
        await self.revoke_during_render()

    async def test_project_file_removed_during_render_cannot_publish(self):
        await self.revoke_during_render(missing=True)

    async def test_running_export_cancel_cleans_up_without_publishing(self):
        entered, release = asyncio.Event(), asyncio.Event()
        self.render(entered, release)
        self.seed_edit()
        item = await self.start_export()
        await asyncio.wait_for(entered.wait(), 5)
        response = await self.client.post(self.url + f'/exports/{item["id"]}/cancel')
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["export"]["status"], "canceled")
        self.assertNotIn("url", self.manager.get("p", item["id"]))
        self.assertFalse((self.manager.work / item["id"]).exists())
        self.assertFalse((self.manager.artifacts / item["id"]).exists())

    async def test_export_error_status_exposes_no_download_or_raw_diagnostic(self):
        self.render(error=RuntimeError("private ffmpeg diagnostic"))
        self.seed_edit()
        item = await self.start_export()
        state = await self.finish(item["id"])
        self.assertEqual(state["status"], "error")
        self.assertIn("error", state)
        self.assertNotIn("diagnostic", state)
        self.assertNotIn("private ffmpeg diagnostic", json.dumps(state))
        self.assertEqual((await self.client.get(self.url + f'/exports/{item["id"]}/download')).status, 409)

    async def test_export_start_revalidates_resource_acl(self):
        self.own_project("other")
        edit = self.seed_edit()
        self.access.register("other", "upload", "foreign.mp4")
        edit["assets"]["video"].update(url="/api/upload/foreign.mp4", ref="chouka/foreign.mp4")
        self.seed_project(edit=edit)
        before = self.project_path.read_bytes()
        await self.start_export(expected=404)
        self.assertEqual(self.manager.list("p"), [])
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "foreign.mp4", "p"))

    async def test_download_revalidates_artifact_binding_and_missing_file(self):
        self.render()
        self.seed_edit()
        item = await self.start_export()
        done = await self.finish(item["id"])
        self.assertEqual(done["status"], "done")
        url = self.url + f'/exports/{item["id"]}/download'
        resource = self.access.reference(done["url"])
        self.own_project("other")
        self.access.register("other", "artifact", "foreign/film.mp4")
        foreign = self.access.local_path("artifact", "foreign/film.mp4")
        foreign.parent.mkdir(parents=True, exist_ok=True)
        foreign.write_bytes(b"foreign film")
        # Seed durable metadata as well as memory: manager readers may refresh
        # records from disk when another application can observe the same export.
        self.manager._update(self.manager.records[item["id"]], url="/api/artifact/foreign/film.mp4")
        self.assertEqual((await self.client.get(url)).status, 404)
        self.manager._update(self.manager.records[item["id"]], url=done["url"])
        row = self.access.lookup(*resource)
        with self.auth._tx():
            self.auth.db.execute("DELETE FROM project_resources WHERE project_id=? AND resource_id=?",
                                 ("p", row["resource_id"]))
        self.assertEqual((await self.client.get(url)).status, 404)
        self.access.register("p", *resource)
        self.access.local_path(*resource).unlink()
        self.assertEqual((await self.client.get(url)).status, 404)

    async def test_export_ids_are_project_scoped_and_unknown_is_404(self):
        self.seed_edit()
        self.own_project("other")
        await self.manager.slots.acquire()
        item = await self.start_export()
        for prefix, eid in ((self.url, "missing"), ("/api/projects/other/edit", item["id"])):
            self.assertEqual((await self.client.get(prefix + f"/exports/{eid}/download")).status, 404)
            self.assertEqual((await self.client.post(prefix + f"/exports/{eid}/cancel")).status, 404)
        response = await self.client.get("/api/projects/other/edit/exports")
        self.assertEqual((await response.json())["exports"], [])

    async def test_cancel_foreign_instance_export_is_409_without_disk_edits(self):
        self.seed_edit()
        await self.manager.slots.acquire()
        item = await self.start_export()
        eid = item["id"]
        before_project = self.project_path.read_bytes()
        metadata = self.manager.metadata / (eid + ".json")
        before_metadata = metadata.read_bytes()
        storage = (self.manager.metadata, self.manager.artifacts, self.root / "data" / "uploads")
        before_paths = {path for directory in storage for path in directory.rglob("*")}
        # Active Windows export locks cannot be opened for reads; assert their
        # presence is unchanged, and compare bytes of every other stored file.
        before_files = {path: path.read_bytes() for path in before_paths
                        if path.is_file() and path.suffix != ".lock"}
        generation = self.generation_state()
        with mock.patch.object(self.manager, "cancel", new_callable=mock.AsyncMock,
                               side_effect=ExportBusyError("private foreign-owner diagnostic")) as cancel:
            response = await self.client.post(self.url + f"/exports/{eid}/cancel")
            text = await response.text()
            self.assertEqual(response.status, 409, text)
        cancel.assert_awaited_once_with("p", eid)
        self.assertIn("另一服务实例", text)
        self.assertIn("发起导出", text)
        self.assertNotIn("private foreign-owner diagnostic", text)
        self.assertEqual(self.project_path.read_bytes(), before_project)
        self.assertEqual(metadata.read_bytes(), before_metadata)
        after_paths = {path for directory in storage for path in directory.rglob("*")}
        self.assertEqual(after_paths, before_paths)
        self.assertEqual({path: path.read_bytes() for path in after_paths
                          if path.is_file() and path.suffix != ".lock"}, before_files)
        self.assertEqual(self.manager.get("p", eid), item)
        self.assertIn(eid, self.manager.tasks)
        self.assertEqual(self.generation_state(), generation)

    async def test_project_delete_foreign_export_busy_still_revokes_access_and_renames(self):
        self.seed_edit()
        before_project = self.project_path.read_bytes()
        generation = self.generation_state()

        async def busy(pid):
            # ACL closure precedes cancellation; moving the file follows it.
            self.assertEqual(self.auth.get_project(pid)["state"], "deleted")
            self.assertIsNone(self.auth.project_permission(self.admin["id"], pid))
            self.assertFalse(self.access.authorize(self.admin["id"], "upload", "video.mp4", pid))
            self.assertTrue(self.project_path.is_file())
            raise ExportBusyError("export belongs to another manager")

        with mock.patch.object(self.manager, "cancel_project", new_callable=mock.AsyncMock,
                               side_effect=busy) as cancel_project:
            response = await self.client.delete("/api/projects/p")
            self.assertEqual(response.status, 200, await response.text())
            self.assertEqual(await response.json(), {"ok": True})
        cancel_project.assert_awaited_once_with("p")
        self.assertFalse(self.project_path.exists())
        self.assertEqual(self.project_path.with_suffix(".json.deleted").read_bytes(), before_project)
        self.assertEqual(self.auth.get_project("p")["state"], "deleted")
        self.assertIsNone(self.auth.project_permission(self.admin["id"], "p"))
        for suffix in ("", "/exports", "/exports/foreign/download"):
            self.assertEqual((await self.client.get(self.url + suffix)).status, 404)
        self.assertFalse(self.manager.closed, "Project deletion is not manager shutdown")
        self.assertEqual(self.generation_state(), generation)

    async def test_project_delete_cancels_exports_and_revokes_routes(self):
        self.seed_edit()
        await self.manager.slots.acquire()
        item = await self.start_export()
        response = await self.client.delete("/api/projects/p")
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.manager.get("p", item["id"])["status"], "canceled")
        self.assertFalse(self.project_path.exists())
        self.assertTrue(self.project_path.with_suffix(".json.deleted").is_file())
        for suffix in ("", "/exports", f'/exports/{item["id"]}/download'):
            self.assertEqual((await self.client.get(self.url + suffix)).status, 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "video.mp4", "p"))

    async def test_real_application_cleanup_closes_and_cancels_export_manager(self):
        self.seed_edit()
        await self.manager.slots.acquire()
        item = await self.start_export()
        self.assertFalse(self.manager.closed)
        await self.client.close()
        self.assertTrue(self.manager.closed)
        self.assertEqual(self.manager.get("p", item["id"])["status"], "canceled")
        self.assertEqual(self.manager.tasks, {})
        self.assertEqual(self.manager.processes, {})

    async def mutation_requests(self, expected):
        before = self.project_path.read_bytes()
        requests = [
            self.client.put(self.url, json=empty_edit()),
            self.client.post(self.url + "/import", json={"rev": 0, "output": {"kind": "video", "url": "/api/upload/missing.mp4"}}),
            self.client.post(self.url + "/upload", data=self.multipart([("rev", "0", None), ("file", b"media", "a.mp4")])),
            self.client.post(self.url + "/exports", json={"rev": 0}),
            self.client.post(self.url + "/exports/missing/cancel"),
        ]
        for response in await asyncio.gather(*requests):
            self.assertEqual(response.status, expected, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)
        self.assertEqual(self.manager.list("p"), [])

    async def test_all_edit_routes_require_login(self):
        self.client.session.cookie_jar.clear()
        for suffix in ("", "/exports", "/exports/missing/download"):
            self.assertEqual((await self.client.get(self.url + suffix)).status, 401)
        await self.mutation_requests(401)

    async def test_reader_can_get_status_but_cannot_mutate(self):
        reader = self.auth.create_user("reader", auth_support.PASSWORD)
        self.auth.set_grant(reader["id"], self.admin["id"], "read")
        await self.switch_user("reader")
        self.assertEqual(await self.get_edit(), empty_edit())
        self.assertEqual((await self.client.get(self.url + "/exports")).status, 200)
        await self.mutation_requests(403)

    async def test_locked_project_readable_but_all_mutations_forbidden(self):
        self.seed_project(locked=True)
        self.assertEqual(await self.get_edit(), empty_edit())
        self.assertEqual((await self.client.get(self.url + "/exports")).status, 200)
        await self.mutation_requests(403)

    async def test_foreign_user_cannot_read_or_mutate(self):
        self.auth.create_user("stranger", auth_support.PASSWORD)
        await self.switch_user("stranger")
        for suffix in ("", "/exports", "/exports/missing/download"):
            self.assertEqual((await self.client.get(self.url + suffix)).status, 404)
        await self.mutation_requests(404)

    async def test_normal_owner_can_save_upload_and_export(self):
        owner = self.auth.create_user("owner", auth_support.PASSWORD)
        self.own_project("owned", owner=owner)
        self.project_path = self.root / "data" / "projects" / "owned.json"
        self.url = "/api/projects/owned/edit"
        await self.switch_user("owner")
        self.probe()
        await self.save(empty_edit())
        payload = await (await self.upload(rev=1)).json()
        edit = payload["edit"]
        edit["clips"] = [clip(payload["asset"]["id"])]
        await self.save(edit)
        await self.manager.slots.acquire()
        item = await self.start_export(rev=3)
        self.assertEqual(item["user_id"], owner["id"])
        self.assertEqual(item["project"], "owned")

    async def test_csrf_token_origin_and_cross_site_rejected_on_every_mutation(self):
        self.client.session.headers.clear()
        cases = [
            {"Origin": self.origin},
            {"Origin": self.origin, "X-CSRF-Token": "wrong"},
            {"X-CSRF-Token": self.headers["X-CSRF-Token"]},
            {**self.headers, "Origin": "https://foreign.invalid"},
            {**self.headers, "Sec-Fetch-Site": "cross-site"},
        ]
        for headers in cases:
            with self.subTest(headers=headers):
                self.client.session.headers.clear()
                self.client.session.headers.update(headers)
                await self.mutation_requests(403)
        self.client.session.headers.clear()
        self.client.session.headers.update(self.headers)
        await self.save(empty_edit())


if __name__ == "__main__":
    unittest.main()
