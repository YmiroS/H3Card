"""Isolated CPU FFmpeg tests; no app imports, network, GPU, services or user data."""
import array
import asyncio
import copy
import json
import math
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "server"))
import edit_export
from edit_export import EditExports, clip_duration, total_duration

try:
    import imageio_ffmpeg
    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except (ImportError, RuntimeError):
    FFMPEG = None


def command(*args):
    result = subprocess.run([FFMPEG, "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                             "-filter_threads", "2", "-filter_complex_threads", "2", *map(str, args)],
                            capture_output=True, timeout=60)
    if result.returncode:
        raise AssertionError(result.stderr.decode("utf-8", errors="replace"))
    return result.stdout


def fixture(video, image, music):
    return {"rev": 7, "ratio": "16:9", "resolution": 720, "fps": 30,
            "assets": {"v": {"kind": "video", "url": "/approved/video", "duration": 2,
                              "width": 96, "height": 64, "has_audio": True, "source": "upload"},
                       "i": {"kind": "image", "url": "/approved/image", "duration": 0,
                              "width": 96, "height": 64, "has_audio": False, "source": "upload"},
                       "m": {"kind": "audio", "url": "/approved/music", "duration": 2,
                              "has_audio": True, "source": "artifact"}},
            "clips": [{"id": "c1", "asset": "v", "in": 0.2, "out": 0.6, "speed": 0.5,
                       "volume": 0.5, "fit": "contain"},
                      {"id": "c2", "asset": "v", "in": 0.2, "out": 1, "speed": 2,
                       "volume": 0.5, "fit": "cover"},
                      {"id": "c3", "asset": "i", "in": 0, "out": 0.3, "speed": 1,
                       "volume": 1, "fit": "contain"}], "audio": [], "texts": []}


class DurationTests(unittest.TestCase):
    def test_half_up_not_bankers_rounding(self):
        self.assertEqual(clip_duration({"in": 0, "out": 2.5 / 30, "speed": 1}), 3 / 30)
        self.assertEqual(clip_duration({"in": 0, "out": 0.001, "speed": 1}), 1 / 30)
        self.assertEqual(clip_duration({"in": 0.2, "out": 0.6, "speed": 0.5}), 0.8)
        self.assertEqual(clip_duration({"in": 0.2, "out": 1, "speed": 2}), 0.4)
        self.assertEqual(total_duration({"fps": 30, "clips": [{"in": 0, "out": 1 / 30}] * 200}), 200 / 30)

    def test_invalid_numbers(self):
        for interval in (0, -1, float("inf"), float("nan")):
            with self.subTest(interval=interval), self.assertRaises(ValueError):
                clip_duration({"in": 0, "out": interval})
        with self.assertRaises(ValueError):
            clip_duration({"in": 0, "out": 1, "speed": 0})

    def test_ass_thresholds_follow_the_frame_grid(self):
        self.assertEqual(edit_export._ass_time(0.034), "0:00:00.06")
        self.assertEqual(edit_export._ass_time(0.099), "0:00:00.10")
        self.assertEqual(edit_export._ass_time(1 / 30), "0:00:00.03")
        self.assertEqual(edit_export._ass_time(2 / 30), "0:00:00.06")

    def test_atempo_chain(self):
        self.assertEqual(edit_export._atempo(0.25), "atempo=0.5,atempo=0.5")
        self.assertEqual(edit_export._atempo(4), "atempo=2,atempo=2")


class AdvisoryLockTests(unittest.TestCase):
    def test_same_process_and_child_exclusion_then_release(self):
        with tempfile.TemporaryDirectory(prefix="edit-export-lock-") as root:
            path = Path(root) / "export.lock"
            lock = edit_export._ExportLock.acquire(path)
            self.assertIsNotNone(lock)
            code = ("import sys; from pathlib import Path; "
                    "sys.path.insert(0, sys.argv[1]); from edit_export import _ExportLock; "
                    "lock = _ExportLock.acquire(Path(sys.argv[2])); "
                    "print('blocked' if lock is None else 'acquired'); "
                    "lock.close() if lock is not None else None")
            try:
                self.assertIsNone(edit_export._ExportLock.acquire(path))
                child = subprocess.run([sys.executable, "-B", "-c", code,
                                        str(Path(edit_export.__file__).parent), str(path)],
                                       capture_output=True, text=True, timeout=10, check=True)
                self.assertEqual(child.stdout.strip(), "blocked")
            finally:
                lock.close()
            child = subprocess.run([sys.executable, "-B", "-c", code,
                                    str(Path(edit_export.__file__).parent), str(path)],
                                   capture_output=True, text=True, timeout=10, check=True)
            self.assertEqual(child.stdout.strip(), "acquired")
            self.assertTrue(path.is_file())  # stable inode/handle target; never unlink

    def test_crashed_child_releases_lock_without_pid_checks(self):
        with tempfile.TemporaryDirectory(prefix="edit-export-crash-") as root:
            path = Path(root) / "export.lock"
            code = ("import os, sys; from pathlib import Path; "
                    "sys.path.insert(0, sys.argv[1]); from edit_export import _ExportLock; "
                    "lock = _ExportLock.acquire(Path(sys.argv[2])); "
                    "os._exit(0 if lock is not None else 1)")
            subprocess.run([sys.executable, "-B", "-c", code,
                            str(Path(edit_export.__file__).parent), str(path)], timeout=10, check=True)
            lock = edit_export._ExportLock.acquire(path)
            self.assertIsNotNone(lock)
            lock.close()


@unittest.skipUnless(FFMPEG, "imageio FFmpeg is not installed")
class ExportTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.media_temp = tempfile.TemporaryDirectory(prefix="edit-export-media-")
        cls.media = Path(cls.media_temp.name)
        cls.video, cls.image, cls.music = (cls.media / name for name in ("video.mp4", "image.png", "music.wav"))
        command("-f", "lavfi", "-i", "testsrc2=size=96x64:rate=30:duration=2",
                "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-threads", "2", "-c:a", "aac", cls.video)
        command("-f", "lavfi", "-i", "color=red:size=96x64:duration=0.1", "-frames:v", "1", "-threads", "2", cls.image)
        command("-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=2", cls.music)

    @classmethod
    def tearDownClass(cls):
        cls.media_temp.cleanup()

    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="edit-export-test-")
        self.root = Path(self.temp.name)
        self.allowed = True
        self.events = []
        self.published = []
        self.paths = {"/approved/video": self.video, "/approved/image": self.image, "/approved/music": self.music}

        async def authorize(pid, user):
            self.events.append(("acl", pid, user))
            return self.allowed

        async def resolve(pid, user, asset):
            self.events.append(("resolve", pid, user, copy.deepcopy(asset)))
            return self.paths[asset["url"]]

        async def publish(pid, user, export_id, path):
            self.assertTrue(path.is_file())
            self.assertEqual(path, self.root / "data" / "artifacts" / export_id / "film.mp4")
            self.events.append(("publish", pid, user))
            self.published.append((export_id, path))
            return f"/api/artifact/{export_id}/film.mp4"

        self.manager = EditExports(self.root, lambda: FFMPEG, resolve, authorize, publish)
        self.edit = fixture(self.video, self.image, self.music)

    async def asyncTearDown(self):
        await self.manager.close()
        self.temp.cleanup()

    async def finish(self, record):
        task = self.manager.tasks.get(record["id"])
        if task:
            await asyncio.wait_for(asyncio.shield(task), 90)
        state = self.manager.get("p", record["id"])
        if state["status"] == "error":
            self.fail(json.dumps(self.manager.records[record["id"]], ensure_ascii=False))
        return state

    def inspect_output(self, path, frames, dimensions="1280x720"):
        actual_frames, duration = imageio_ffmpeg.count_frames_and_secs(str(path))
        self.assertEqual(actual_frames, frames)
        self.assertAlmostEqual(duration, frames / 30, delta=0.035)
        result = subprocess.run([FFMPEG, "-hide_banner", "-i", str(path)], capture_output=True, timeout=20)
        info = result.stderr.decode(errors="replace")
        self.assertIn(dimensions, info)
        self.assertIn("yuv420p", info)
        self.assertRegex(info, r"\b30 fps\b")
        self.assertIn("48000 Hz, stereo", info)
        self.assertIn("h264", info)
        self.assertIn("aac", info)
        data = path.read_bytes()
        self.assertLess(data.index(b"moov"), data.index(b"mdat"))

    async def test_real_trim_speed_image_concat_audio_pitch_and_resource_registration(self):
        state = await self.finish(self.manager.start("p", "u", self.edit))
        self.assertEqual(state["status"], "done")
        self.assertEqual(state["progress"], 1)
        self.assertEqual(state["duration"], 1.5)
        self.assertEqual(state["url"], f"/api/artifact/{state['id']}/film.mp4")
        path = self.published[0][1]
        self.inspect_output(path, 45)
        pcm = array.array("h", command("-i", path, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "pipe:1"))
        for start, end in ((0.15, 0.65), (0.88, 1.1)):
            region = pcm[int(start * 48000):int(end * 48000)]
            crossings = sum(a <= 0 < b for a, b in zip(region, region[1:]))
            self.assertAlmostEqual(crossings / (end - start), 440, delta=18)
        silence = pcm[int(1.28 * 48000):int(1.45 * 48000)]
        self.assertLess(max(abs(value) for value in silence), 100)
        resolved = [event for event in self.events if event[0] == "resolve"]
        self.assertEqual(len(resolved), 2)  # same source reused, approved only once
        self.assertEqual(self.events[-2][0], "acl")
        self.assertEqual(self.events[-1][0], "publish")
        self.assertFalse((self.manager.work / state["id"]).exists())
        public = self.manager.list("p")[0]
        self.assertNotIn("snapshot", public)
        self.assertNotIn(str(self.root), json.dumps(public))

    async def test_music_chinese_multiline_and_literal_hostile_text(self):
        self.edit["audio"] = [{"id": "a", "asset": "m", "in": 0.2, "out": 0.6, "start": 1.1, "volume": 0.5}]
        self.edit["texts"] = [
            {"id": "t", "text": "中文测试\n第二行", "start": 0, "end": 1.4,
             "x": 0.5, "y": 0.5, "size": 36, "color": "#12abef"},
            {"id": "literal", "text": "'{\\pos(0,0)}\\N,evil'\x7f", "start": 0.2, "end": 1.5,
             "x": 0.5, "y": 0.8, "size": 24, "color": "#ffffff"}]
        # A missing installed CJK font is a supported clear failure, never tofu.
        try:
            await asyncio.to_thread(edit_export._installed_font, "中文测试第二行")
        except edit_export._ExportError as exc:
            self.skipTest(str(exc))
        state = await self.finish(self.manager.start("p", "u", self.edit))
        path = self.published[0][1]
        self.inspect_output(path, 45)
        pcm = array.array("h", command("-i", path, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "pipe:1"))
        region = pcm[int(1.3 * 48000):int(1.45 * 48000)]
        rms = math.sqrt(sum(value * value for value in region) / len(region))
        self.assertGreater(rms, 500)
        self.assertEqual(state["status"], "done")

    async def test_adjacent_audio_float_boundaries_are_accepted(self):
        self.edit["clips"] = [dict(self.edit["clips"][-1], out=0.7)]
        self.edit["audio"] = [
            {"id": "a1", "asset": "m", "in": 0, "out": 0.2, "start": 0.1, "volume": 0.5},
            {"id": "a2", "asset": "m", "in": 0, "out": 0.2, "start": 0.3, "volume": 0.5}]
        state = await self.finish(self.manager.start("p", "u", self.edit))
        self.assertEqual(state["status"], "done")
        path = self.published[0][1]
        self.inspect_output(path, 21)
        pcm = array.array("h", command("-i", path, "-vn", "-ac", "1", "-ar", "48000", "-f", "s16le", "pipe:1"))
        for start, end in ((0.15, 0.25), (0.28, 0.32), (0.35, 0.45)):
            region = pcm[int(start * 48000):int(end * 48000)]
            self.assertGreater(math.sqrt(sum(value * value for value in region) / len(region)), 500)
        self.edit["audio"][1]["start"] = 0.299
        with self.assertRaises(ValueError):
            self.manager.start("p", "u", self.edit)

    async def test_normal_and_literal_fractional_frame_text_visibility_pixels(self):
        try:
            await asyncio.to_thread(edit_export._installed_font, "HELLO{}")
        except edit_export._ExportError as exc:
            self.skipTest(str(exc))
        self.edit["ratio"] = "1:1"
        self.edit["clips"] = [dict(self.edit["clips"][-1], fit="cover")]
        for start, end, expected in ((0.034, 0.099, [2]), (1 / 30, 2 / 30, [1]), (0.034, 0.05, [])):
            with self.subTest(start=start, end=end):
                self.edit["texts"] = [
                    {"id": "normal", "text": "HELLO", "start": start, "end": end,
                     "x": 0.25, "y": 0.5, "size": 72, "color": "#ffffff"},
                    {"id": "literal", "text": "{HELLO}", "start": start, "end": end,
                     "x": 0.75, "y": 0.5, "size": 72, "color": "#ffffff"}]
                record = await self.finish(self.manager.start("p", "u", self.edit))
                path = self.manager.artifacts / record["id"] / "film.mp4"
                data = command("-i", path, "-vf", "scale=180:180:flags=neighbor",
                               "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1")
                size = 180 * 180 * 3
                self.assertEqual(len(data), size * 9)
                visible = [[], []]
                for frame in range(9):
                    pixels = data[frame * size:(frame + 1) * size]
                    counts = [0, 0]
                    for offset in range(0, size, 3):
                        if all(value > 220 for value in pixels[offset:offset + 3]):
                            side = ((offset // 3) % 180) // 90
                            counts[side] += 1
                    for side in range(2):
                        if counts[side] > 5:
                            visible[side].append(frame)
                self.assertEqual(visible, [expected, expected])

    async def test_queue_and_immutable_snapshot(self):
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.manager.resolve_asset

        async def blocked(pid, user, asset):
            entered.set()
            await release.wait()
            result = await original(pid, user, asset)
            asset["url"] = "mutated callback copy"
            return result

        self.manager.resolve_asset = blocked
        self.edit["clips"] = self.edit["clips"][-1:]
        first = self.manager.start("p", "u", self.edit)
        await asyncio.wait_for(entered.wait(), 5)
        second = self.manager.start("p", "u", self.edit)
        self.edit["rev"] = 999
        self.edit["assets"]["i"]["url"] = "mutated caller"
        self.edit["clips"][0]["out"] = 9
        self.assertEqual(self.manager.get("p", second["id"])["status"], "queued")
        self.assertFalse(self.manager.processes)
        release.set()
        first, second = await self.finish(first), await self.finish(second)
        self.assertEqual([first["edit_rev"], second["edit_rev"]], [7, 7])
        for record in (first, second):
            self.assertEqual(record["duration"], 0.3)
            self.inspect_output(self.root / "data" / "artifacts" / record["id"] / "film.mp4", 9)
        self.assertEqual(self.manager.records[first["id"]]["snapshot"]["assets"]["i"]["url"], "/approved/image")

    async def test_queued_cancel_project_and_wrong_project(self):
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.manager.resolve_asset

        async def blocked(*args):
            entered.set()
            await release.wait()
            return await original(*args)

        self.manager.resolve_asset = blocked
        first = self.manager.start("p", "u", self.edit)
        await asyncio.wait_for(entered.wait(), 5)
        second = self.manager.start("p", "u", self.edit)
        with self.assertRaises(KeyError):
            await self.manager.cancel("other", first["id"])
        self.assertEqual(self.manager.list("other"), [])
        canceled = await self.manager.cancel("p", second["id"])
        self.assertEqual(canceled["status"], "canceled")
        await self.manager.cancel_project("p")
        self.assertEqual(self.manager.get("p", first["id"])["status"], "canceled")
        self.assertFalse(self.manager.processes)
        self.assertFalse(self.published)
        self.assertEqual(list(self.manager.work.iterdir()), [])
        self.assertEqual(list(self.manager.artifacts.iterdir()), [])

    async def test_running_cancel_terminates_owned_real_process_and_close(self):
        self.edit["clips"] = [dict(self.edit["clips"][-1], out=120)]
        self.edit["resolution"] = 1080
        record = self.manager.start("p", "u", self.edit)
        async with asyncio.timeout(10):
            while record["id"] not in self.manager.processes:
                await asyncio.sleep(0.005)
        process = self.manager.processes[record["id"]]
        await self.manager.close()
        self.assertIsNotNone(process.returncode)
        self.assertEqual(self.manager.get("p", record["id"])["status"], "canceled")
        self.assertFalse(self.manager.processes)
        self.assertFalse(self.published)
        self.assertFalse((self.manager.work / record["id"]).exists())
        self.assertFalse((self.manager.artifacts / record["id"]).exists())
        with self.assertRaises(RuntimeError):
            self.manager.start("p", "u", self.edit)

    async def test_acl_denial_and_recheck_after_resolving(self):
        self.allowed = False
        denied = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[denied["id"]]
        self.assertEqual(self.manager.get("p", denied["id"])["status"], "error")
        self.assertFalse(any(event[0] == "resolve" for event in self.events))
        self.allowed = True
        original = self.manager.resolve_asset

        async def revoked(*args):
            path = await original(*args)
            self.allowed = False
            return path

        self.manager.resolve_asset = revoked
        revoked_record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[revoked_record["id"]]
        self.assertEqual(self.manager.get("p", revoked_record["id"])["status"], "error")
        self.assertFalse(self.published)
        self.assertFalse(self.manager.processes)

    async def test_acl_recheck_before_publish_removes_finished_unregistered_file(self):
        self.edit["clips"] = self.edit["clips"][-1:]
        original = self.manager._render

        async def revoke_after_render(*args):
            path = await original(*args)
            self.assertTrue(path.is_file())
            self.allowed = False
            return path

        self.manager._render = revoke_after_render
        record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[record["id"]]
        self.assertEqual(self.manager.get("p", record["id"])["status"], "error")
        self.assertFalse(self.published)
        self.assertFalse((self.manager.artifacts / record["id"]).exists())

    async def test_shared_root_observer_preserves_running_and_queued_exports(self):
        entered, release = asyncio.Event(), asyncio.Event()
        original = self.manager.resolve_asset

        async def blocked(*args):
            entered.set()
            await release.wait()
            return await original(*args)

        self.manager.resolve_asset = blocked
        self.edit["clips"] = self.edit["clips"][-1:]
        running = self.manager.start("p", "u", self.edit)
        await asyncio.wait_for(entered.wait(), 5)
        queued = self.manager.start("p", "u", self.edit)
        work = self.manager.work / running["id"]
        marker = work / "active-work-marker"
        marker.write_bytes(b"must survive another startup")
        observer = EditExports(self.root, FFMPEG, original,
                               self.manager.authorize, self.manager.publish)
        try:
            self.assertEqual(observer.get("p", running["id"])["status"], "running")
            self.assertEqual(observer.get("p", queued["id"])["status"], "queued")
            self.assertEqual(marker.read_bytes(), b"must survive another startup")
            for item, status in ((running, "running"), (queued, "queued")):
                persisted = json.loads((self.manager.metadata / f"{item['id']}.json").read_text(encoding="utf-8"))
                self.assertEqual(persisted["status"], status)
            # Foreign cancellation/project shutdown/close must not destroy an
            # export whose lifetime lock is owned by the first application.
            with self.assertRaises(edit_export.ExportBusyError):
                await observer.cancel("p", running["id"])
            with self.assertRaises(edit_export.ExportBusyError):
                await observer.cancel_project("p")
            await observer.close()
            self.assertTrue(marker.is_file())
            self.assertEqual(self.manager.get("p", running["id"])["status"], "running")
            self.assertEqual(self.manager.get("p", queued["id"])["status"], "queued")
            release.set()
            for item in (running, queued):
                done = await self.finish(item)
                self.assertEqual(done["status"], "done")
                # get refreshes a foreign final record instead of serving its
                # startup snapshot indefinitely, even after observer close.
                seen = observer.get("p", item["id"])
                self.assertEqual(seen["status"], "done")
                self.assertEqual(seen["url"], done["url"])
                self.inspect_output(self.manager.artifacts / item["id"] / "film.mp4", 9)
            self.assertEqual({item["status"] for item in observer.list("p")}, {"done"})
            # Exports created after this observer started are discovered too.
            later = await self.finish(self.manager.start("p", "u", self.edit))
            self.assertEqual(observer.get("p", later["id"])["status"], "done")
            self.assertEqual(len(observer.list("p")), 3)
            self.assertFalse(self.manager._locks)
        finally:
            release.set()
            await observer.close()

    async def test_lock_is_acquired_before_persist_and_survives_until_cleanup(self):
        original_persist, original_cleanup = self.manager._persist, self.manager._cleanup
        seen = []

        def persist(record):
            path = self.manager.lock_dir / (record["id"] + ".lock")
            self.assertIsNone(edit_export._ExportLock.acquire(path))
            seen.append(("persist", record["status"]))
            original_persist(record)

        def cleanup(record):
            path = self.manager.lock_dir / (record["id"] + ".lock")
            self.assertIsNone(edit_export._ExportLock.acquire(path))
            seen.append(("cleanup", record["status"]))
            original_cleanup(record)

        self.manager._persist, self.manager._cleanup = persist, cleanup
        record = self.manager.start("p", "u", self.edit)
        # Cancel synchronously after scheduling, before _run's first instruction.
        await self.manager.cancel("p", record["id"])
        self.assertEqual(self.manager.get("p", record["id"])["status"], "canceled")
        self.assertIn(("persist", "queued"), seen)
        self.assertIn(("cleanup", "canceled"), seen)
        lock = edit_export._ExportLock.acquire(self.manager.lock_dir / (record["id"] + ".lock"))
        self.assertIsNotNone(lock)
        lock.close()
        self.assertFalse(self.manager._locks)
        self.edit["clips"] = self.edit["clips"][-1:]
        done = await self.finish(self.manager.start("p", "u", self.edit))
        self.assertEqual(done["status"], "done")
        self.assertIn(("cleanup", "done"), seen)
        self.assertFalse(self.manager._locks)

    async def test_persist_failure_does_not_leak_export_lock(self):
        with mock.patch.object(self.manager, "_persist", side_effect=OSError("test write failure")):
            with self.assertRaises(OSError):
                self.manager.start("p", "u", self.edit)
        self.assertFalse(self.manager._locks)
        self.assertFalse(self.manager.tasks)
        for path in self.manager.lock_dir.glob("*.lock"):
            lock = edit_export._ExportLock.acquire(path)
            self.assertIsNotNone(lock)
            lock.close()

    async def test_restart_retains_done_and_cancels_interrupted_metadata(self):
        self.edit["clips"] = self.edit["clips"][-1:]
        done = await self.finish(self.manager.start("p", "u", self.edit))
        await self.manager.close()
        for index, status in enumerate(("queued", "running")):
            export_id = f"{index + 1:032x}"
            record = dict(done, id=export_id, status=status, snapshot=self.edit)
            record.pop("url", None)
            (self.manager.metadata / f"{export_id}.json").write_text(json.dumps(record), encoding="utf-8")
            work = self.manager.work / export_id
            work.mkdir()
            (work / "partial").write_bytes(b"partial")
            artifact = self.manager.artifacts / export_id
            artifact.mkdir()
            (artifact / "film.part.mp4").write_bytes(b"partial")
        restarted = EditExports(self.root, FFMPEG, self.manager.resolve_asset,
                                self.manager.authorize, self.manager.publish)
        try:
            self.assertEqual(restarted.get("p", done["id"])["status"], "done")
            self.assertTrue(self.published[0][1].exists())
            for index in range(2):
                export_id = f"{index + 1:032x}"
                self.assertEqual(restarted.get("p", export_id)["status"], "canceled")
                self.assertFalse((restarted.work / export_id).exists())
                self.assertFalse((restarted.artifacts / export_id).exists())
                persisted = json.loads((restarted.metadata / f"{export_id}.json").read_text(encoding="utf-8"))
                self.assertEqual(persisted["status"], "canceled")
            self.assertFalse(list(restarted.metadata.glob("*.tmp")))
        finally:
            await restarted.close()

    async def test_clear_font_failure_and_no_raw_filter_text(self):
        self.edit["texts"] = [{"id": "t", "text": "中文", "start": 0, "end": 1,
                               "x": 0.5, "y": 0.5, "size": 32, "color": "#123456"}]
        self.edit["clips"] = self.edit["clips"][-1:]
        with mock.patch.object(edit_export, "_installed_font", side_effect=edit_export._ExportError("Chinese font missing")):
            record = self.manager.start("p", "u", self.edit)
            await self.manager.tasks[record["id"]]
        state = self.manager.get("p", record["id"])
        self.assertEqual(state["status"], "error")
        self.assertIn("Chinese font missing", state["error"])
        self.assertFalse(self.published)
        try:
            await asyncio.to_thread(edit_export._installed_font, "中文")
        except edit_export._ExportError:
            return
        directory = self.root / "text-check"
        directory.mkdir()
        self.edit["texts"].append(dict(self.edit["texts"][0], text="'{\\pos(9,9)}\\N\x7f", y=0.25))
        filters = await self.manager._texts(self.edit, directory)
        ass = (directory / "captions.ass").read_text(encoding="utf-8")
        self.assertIn("\\an5\\pos(640,360)\\fs32\\c&H563412&", ass)
        self.assertNotIn("\\pos(9,9)", ass)
        self.assertIn("expansion=none", filters[-1])
        self.assertNotIn("\\pos(9,9)", filters[-1])
        self.assertEqual((directory / "text0001.txt").read_text(encoding="utf-8"), self.edit["texts"][1]["text"])

    async def test_rejects_playlists_and_private_errors(self):
        playlist = self.root / "unapproved.m3u8"
        playlist.write_text("http://example.invalid/never-requested", encoding="utf-8")
        self.paths["/approved/video"] = playlist
        record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[record["id"]]
        state = self.manager.get("p", record["id"])
        self.assertEqual(state["status"], "error")
        self.assertNotIn(str(self.root), json.dumps(state))
        self.assertFalse(self.published)
        self.assertFalse(self.manager.processes)
        # Actual corrupt local media must not expose local source paths / stderr.
        corrupt = self.root / "corrupt.mp4"
        corrupt.write_bytes(b"not a video")
        self.paths["/approved/video"] = corrupt
        record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[record["id"]]
        state = self.manager.get("p", record["id"])
        self.assertEqual(state["status"], "error")
        self.assertNotIn(str(self.root), json.dumps(state))
        self.assertNotIn("diagnostic", state)
        self.assertTrue(self.manager.records[record["id"]]["diagnostic"])

    async def test_disguised_playlist_format_is_rejected_by_ffmpeg(self):
        playlist = self.root / "disguised.mp4"
        playlist.write_text("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:2\n"
                            "#EXT-X-MEDIA-SEQUENCE:0\n#EXTINF:2.0,\n" + self.video.as_posix() +
                            "\n#EXT-X-ENDLIST\n", encoding="utf-8")
        self.paths["/approved/video"] = playlist
        record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[record["id"]]
        self.assertEqual(self.manager.get("p", record["id"])["status"], "error")
        diagnostic = self.manager.records[record["id"]]["diagnostic"].lower()
        self.assertIn("hls", diagnostic)
        self.assertTrue("whitelist" in diagnostic or "non standard extension" in diagnostic)
        self.assertFalse(self.published)
        playlist.write_text("ffconcat version 1.0\nfile '" + self.video.as_posix() + "'\n", encoding="utf-8")
        record = self.manager.start("p", "u", self.edit)
        await self.manager.tasks[record["id"]]
        self.assertEqual(self.manager.get("p", record["id"])["status"], "error")
        diagnostic = self.manager.records[record["id"]]["diagnostic"].lower()
        self.assertIn("concat", diagnostic)
        self.assertIn("whitelist", diagnostic)
        # Concat is permitted only for internal generated filenames.
        self.assertNotIn("concat", self.manager._input(self.video)[3])
        self.assertIn("concat", self.manager._input("segments.txt", "-f", "concat")[3])

    async def _check_one_frame_video_export(self, speed):
        source = self.root / "single-frame-video.mp4"
        command("-f", "lavfi", "-i", "testsrc2=size=96x64:rate=30",
                "-frames:v", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                "-r", "30", "-threads", "2", source)
        self.assertEqual(imageio_ffmpeg.count_frames_and_secs(str(source))[0], 1)
        self.paths["/approved/video"] = source
        self.edit["assets"]["v"].update(duration=1 / 30, has_audio=False)
        self.edit["clips"] = [{"id": "one", "asset": "v", "in": 0, "out": 1 / 30,
                               "speed": speed, "volume": 1, "fit": "contain"}]
        state = await self.finish(self.manager.start("p", "u", self.edit))
        self.assertEqual(state["status"], "done")
        self.assertEqual(state["duration"], 1 / 30)
        path = self.published[0][1]
        self.inspect_output(path, 1)
        pcm = array.array("h", command("-i", path, "-vn", "-ac", "1", "-ar", "48000",
                                       "-f", "s16le", "pipe:1"))
        self.assertGreaterEqual(len(pcm), 1600)
        self.assertLessEqual(max(abs(value) for value in pcm), 1)

    async def test_real_single_frame_video_speed_one(self):
        await self._check_one_frame_video_export(1)

    async def test_real_single_frame_video_speed_four(self):
        await self._check_one_frame_video_export(4)

    async def test_short_frame_clips_exact_clock_and_portrait(self):
        self.edit["ratio"] = "9:16"
        self.edit["clips"] = [dict(self.edit["clips"][-1], id=f"c{index}", out=0.001) for index in range(8)]
        state = await self.finish(self.manager.start("p", "u", self.edit))
        self.assertEqual(state["duration"], 8 / 30)
        self.inspect_output(self.published[0][1], 8, "720x1280")
        # Parse packet timestamps, not rounded human-readable duration.
        raw = subprocess.run([FFMPEG, "-hide_banner", "-i", str(self.published[0][1]),
                              "-map", "0:v:0", "-vf", "showinfo", "-f", "null", "-"],
                             capture_output=True, timeout=20).stderr.decode(errors="replace")
        timestamps = [float(value) for value in re.findall(r"pts_time:([\d.]+)", raw)]
        self.assertEqual(len(timestamps), 8)
        for index, timestamp in enumerate(timestamps):
            self.assertAlmostEqual(timestamp, index / 30, places=5)

    async def test_animated_gif_is_static_first_frame_hold(self):
        gif = self.root / "animated.gif"
        command("-f", "lavfi", "-i", "testsrc2=size=96x64:rate=10:duration=0.5", "-threads", "2", gif)
        self.paths["/approved/image"] = gif
        self.edit["ratio"] = "1:1"
        self.edit["clips"] = self.edit["clips"][-1:]
        await self.finish(self.manager.start("p", "u", self.edit))
        path = self.published[0][1]
        self.inspect_output(path, 9, "720x720")
        data = command("-i", path, "-vf", "select=eq(n\\,0)+eq(n\\,8),scale=96:96",
                       "-fps_mode", "vfr", "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1")
        size = 96 * 96 * 3
        self.assertEqual(len(data), size * 2)
        self.assertLess(sum(abs(a - b) for a, b in zip(data[:size], data[size:])) / size, 2)

    async def test_ffmpeg_timeout_reaps_process(self):
        original_wait = asyncio.wait_for

        async def short_wait(awaitable, timeout):
            return await original_wait(awaitable, min(timeout, 0.1))

        record = {"id": "f" * 32}
        directory = self.root / "timeout-check"
        directory.mkdir()
        args = self.manager._input("anullsrc=r=48000:cl=stereo", "-f", "lavfi") + ["-f", "null", "-"]
        with mock.patch.object(edit_export.asyncio, "wait_for", side_effect=short_wait):
            with self.assertRaises(TimeoutError):
                await self.manager._ffmpeg(record, FFMPEG, directory, args, 1)
        self.assertFalse(self.manager.processes)

    async def test_validation_limits_and_square_dimensions(self):
        self.assertEqual(self.manager._dimensions(dict(self.edit, ratio="1:1", resolution=1080)), (1080, 1080))
        cases = [dict(self.edit, fps=60), dict(self.edit, clips=[]),
                 dict(self.edit, clips=self.edit["clips"] * 100),
                 dict(self.edit, clips=[dict(self.edit["clips"][-1], out=3601)]),
                 dict(self.edit, clips=[dict(self.edit["clips"][-1], speed=2)]),
                 dict(self.edit, clips=[dict(self.edit["clips"][0], speed=0.1)]),
                 dict(self.edit, texts=[{"text": "bad", "start": 0, "end": 1, "x": 0.5,
                                        "y": 0.5, "size": 32, "color": "#fff:evil"}])]
        for edit in cases:
            with self.subTest(edit=edit), self.assertRaises(ValueError):
                self.manager.start("p", "u", edit)
        self.assertFalse(self.manager.records)
        self.assertFalse(list(self.manager.metadata.glob("*.json")))
