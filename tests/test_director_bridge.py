"""导演/画布桥接契约：真实 HTTP、AuthFixture 和临时资源，不提交真实任务。

只 mock 启动/能力发现/执行边界；保存、鉴权、资源 ACL、项目锁及 GET 投影
均走 make_app 的生产 handler。未实现的契约直接 FAIL，不 skip/xfail。
"""
import asyncio
import copy
import json
import sys
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
for folder in (ROOT, ROOT / "server", ROOT / "tests"):
    sys.path.insert(0, str(folder))

import test_director as legacy

controller_app = legacy.controller_app
auth_support = legacy.auth_support


def dummy_caps():
    """沿用真实 manifest 的字段/槽位，工作流仅存在于测试临时目录。"""
    result = {}
    for cid, stage, images in (
        ("zimage_t2i", "image", 0), ("zimage_i2i", "image", 1),
        ("minimax_h3_i2v", "video", 1), ("minimax_h3_flf2v", "video", 2),
        ("minimax_h3_talk1", "video", 1), ("minimax_h3_talk2", "video", 2),
    ):
        inputs = [{"key": "prompt", "label": "提示词", "type": "textarea",
                   "default": "", "target": {"node": "1", "input": "prompt"}}]
        if images:
            inputs.insert(0, {"key": "images[0]", "label": "首帧", "type": "image",
                              "required": True,
                              "target": {"node": "1", "input": "image",
                                         "kind": "upload_image"}})
        result[cid] = {
            "id": cid, "name": "测试" + stage, "kind": "gen", "card": stage,
            "outputType": stage, "group": "图片" if stage == "image" else "视频",
            "_graph_ok": True, "graph": "graphs/" + cid + ".api.json",
            "inputs": inputs, "output": {"node": "1"},
            "slots": f"img{images}+aud0+vid0", "images": images, "audios": 0,
            "videos": 0, "slotLimits": {
                "image": {"min": images, "max": images},
                "audio": {"min": 0, "max": 0}, "video": {"min": 0, "max": 0},
            },
        }
    result["missing_graph"] = {**result["zimage_t2i"], "id": "missing_graph",
                               "_graph_ok": False}
    result["image_tool"] = {**result["zimage_t2i"], "id": "image_tool", "kind": "tool"}
    return result


class DirectorBridgeApiTest(unittest.IsolatedAsyncioTestCase, auth_support.AuthFixture):
    # 复用夹具，不继承 DirectorApiTest，避免重复收集其旧 MVP 测试。
    read_project = legacy.DirectorApiTest.read_project
    seed_project = legacy.DirectorApiTest.seed_project
    save = legacy.DirectorApiTest.save
    switch_user = legacy.DirectorApiTest.switch_user
    run_queued_writes = legacy.DirectorApiTest.run_queued_writes

    async def assert_rejected(self, document, status=400, **kwargs):
        before = self.project_path.read_bytes()
        try:
            return await legacy.DirectorApiTest.assert_rejected(self, document, status, **kwargs)
        finally:
            # 若实现误接受负例，保留失败，但恢复临时夹具，避免后续 subTest
            # 只因上一负例递增了 rev 而报无关 409；绝不触碰正式项目。
            if self.project_path.read_bytes() != before:
                self.project_path.write_bytes(before)

    async def asyncSetUp(self):
        self.caps = dummy_caps()
        cards = [{"id": "card_" + stage, "kind": "gen", "outputType": stage,
                  "name": stage, "modes": [{"id": cid, "name": cid}]}
                 for stage, cid in (("image", "zimage_t2i"),
                                    ("video", "minimax_h3_i2v"))]
        cards[0]["modes"].append({"id": "zimage_i2i", "name": "图生图"})
        for patcher in (
            mock.patch.object(controller_app, "CAPS", self.caps),
            mock.patch.object(controller_app, "CARDS", cards),
            mock.patch.object(controller_app, "STEPS", {}),
            mock.patch.object(controller_app, "WEIGHTS", {}),
            mock.patch.object(controller_app, "save_jobs"),
            mock.patch.object(controller_app, "check_local_cleanup"),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        await legacy.DirectorApiTest.asyncSetUp(self)
        graphs = self.root / "graphs"
        graphs.mkdir()
        for cap in self.caps.values():
            if cap["_graph_ok"]:
                (self.root / cap["graph"]).write_text(json.dumps({
                    "1": {"class_type": "DirectorBridgeTestOnly",
                          "inputs": {"prompt": "", "image": ""}},
                }), encoding="utf-8")

        async def submit(_app, _graph, prompt_id=None):
            return prompt_id

        patcher = mock.patch.object(controller_app, "local_submit", side_effect=submit)
        self.submit = patcher.start()
        self.addCleanup(patcher.stop)

    def request_document(self, project=None, shots=None):
        project = self.read_project() if project is None else project
        document = copy.deepcopy(project.get("director", legacy.director(shots)))
        if shots is not None:
            document["shots"] = copy.deepcopy(shots)
        document["canvas_rev"] = project.get("rev", 0)
        return document

    async def get_project(self, pid="p"):
        response = await self.client.get("/api/projects/" + pid)
        self.assertEqual(response.status, 200, await response.text())
        return await response.json()

    async def link(self, shots=None):
        body = self.request_document(shots=[legacy.shot()] if shots is None else shots)
        response = await self.save(body)
        payload = await response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["rev"], body["rev"] + 1)
        self.assertEqual(payload["canvas_rev"], body["canvas_rev"] + 1)
        self.assertEqual(payload["director"], payload["project"]["director"])
        self.assertEqual(payload["canvas_rev"], payload["project"]["rev"])
        for key in ("id", "name", "cards", "edges", "groups", "rev", "updated", "director"):
            self.assertIn(key, payload["project"])
        disk = self.read_project()
        for key in ("id", "name", "cards", "edges", "rev", "updated", "director"):
            self.assertEqual(payload["project"][key], disk[key])
        self.assertNotIn("canvas_rev", disk["director"])
        return payload["project"]

    async def create_import_card(self, cid="existing-image", stage="image", **fields):
        card = {
            "id": cid, "type": "card_" + stage,
            "cap": "zimage_t2i" if stage == "image" else "minimax_h3_i2v",
            "name": "已有" + stage, "x": -400, "y": 600,
            "params": {"prompt": "已有提示词", "seed": 77},
            "assets": {}, "outputs": [], "history": [],
        }
        card.update(fields)
        response = await self.client.post("/api/projects/p/cards", json={"card": card})
        self.assertEqual(response.status, 200, await response.text())
        return (await response.json())["card"]

    def import_body(self, cards, **fields):
        project = self.read_project()
        return {"rev": (project.get("director") or {}).get("rev", 0),
                "canvas_rev": project["rev"], "cards": cards, **fields}

    async def import_cards(self, body, status=200, **kwargs):
        before = self.project_path.read_bytes()
        response = await self.client.post(self.url + "/import", json=body, **kwargs)
        self.assertEqual(response.status, status, await response.text())
        if status != 200:
            self.assertEqual(self.project_path.read_bytes(), before, "导入拒绝必须原子且不写盘")
        return response

    def stage_card(self, project, stage="image", sid="shot-1"):
        item = next(item for item in project["director"]["shots"] if item["id"] == sid)
        cid = item[stage]["card"]
        matches = [card for card in project["cards"] if card["id"] == cid]
        self.assertEqual(len(matches), 1, "导演 card 必须能唯一定位同项目真实画布卡")
        return matches[0]

    async def canvas_save(self, project, **changes):
        body = {key: copy.deepcopy(project.get(key, [])) for key in ("cards", "edges", "groups")}
        body.update(rev=project["rev"], **changes)
        response = await self.client.put("/api/projects/p", json=body)
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual((await response.json())["rev"], project["rev"] + 1)
        return await self.get_project()

    def snapshot_job(self, jid, stage="image", card=None, pid="p", owner=None):
        self.register_job(jid, pid, owner)
        suffix = "png" if stage == "image" else "mp4"
        locator = f"{jid}/result.{suffix}"
        self.access.register(pid, "artifact", locator)
        output = {"kind": stage, "url": "/api/artifact/" + locator,
                  "filename": "result." + suffix}
        controller_app.JOBS[jid] = {
            "id": jid, "project": pid, "card": card,
            "capability": "zimage_t2i" if stage == "image" else "minimax_h3_i2v",
            "outputType": stage, "status": "done", "progress": 1.0,
            "step": "完成", "error": None, "seed": 42,
            "created": 100, "started": 101, "ended": 102, "outputs": [output],
        }
        return output

    def register_upload(self, name, pid="p", kind="image"):
        self.register_asset(name, pid)
        return {**legacy.reference(name), "kind": kind}

    def reference_body(self, project=None, **changes):
        project = self.read_project() if project is None else project
        item = project["director"]["shots"][0]
        body = {"rev": project["director"]["rev"], "canvas_rev": project["rev"],
                "shot": item["id"], "version": copy.deepcopy(item["selected"]["image"]),
                "slot": "images[0]", "asset": legacy.reference("storyboard-reference.png")}
        body.update(changes)
        return body

    async def reference_request(self, body, status=200, **kwargs):
        before = self.project_path.read_bytes()
        response = await self.client.post(self.url + "/reference", json=body, **kwargs)
        if status != 200:
            self.assertEqual(self.project_path.read_bytes(), before,
                             "引用拒绝必须保留逐字节一致的磁盘项目")
        self.assertEqual(response.status, status, await response.text())
        return response

    async def prepare_reference(self, later_job=False, index=0):
        project = await self.link()
        card = self.stage_card(project)
        old = self.snapshot_job("reference-old", card=card["id"])
        outputs = [old]
        if index:
            locator = "reference-old/chosen.png"
            self.access.register("p", "artifact", locator)
            outputs.append({"kind": "image", "url": "/api/artifact/" + locator,
                            "filename": "chosen.png"})
            controller_app.JOBS["reference-old"]["outputs"] = copy.deepcopy(outputs)
        card.update(job="reference-old", status="done", outputs=copy.deepcopy(outputs),
                    history=[{"job": "reference-old", "outputs": copy.deepcopy(outputs)}])
        if later_job:
            latest = self.snapshot_job("reference-latest", card=card["id"])
            card.update(job="reference-latest", outputs=[latest])
            card["history"].insert(0, {"job": "reference-latest", "outputs": [latest]})
        project = await self.canvas_save(project)
        body = self.request_document(project)
        body["shots"][0]["selected"] = {"image": {"job": "reference-old", "index": index}}
        project = (await (await self.save(body)).json())["project"]
        self.register_upload("storyboard-reference.png")
        return project, copy.deepcopy(outputs[index])

    async def test_atomic_save_creates_requested_owned_gen_cards_without_auto_edge(self):
        project = await self.link()
        self.assertEqual(len(project["cards"]), 2)
        ids = set()
        for stage in ("image", "video"):
            card = self.stage_card(project, stage)
            ids.add(card["id"])
            self.assertEqual(card["cap"], project["director"]["shots"][0][stage]["capability"])
            self.assertEqual(self.caps[card["cap"]]["kind"], "gen")
            self.assertEqual(self.caps[card["cap"]]["outputType"], stage)
            self.assertEqual(card["type"], "card_" + stage)
            self.assertEqual(card["created_by"], self.admin["id"])
            self.assertEqual(card["created_by_name"], self.admin.get("display_name") or "admin")
            self.assertGreater(card["created_at"], 0)
            for key in ("x", "y"):
                self.assertIsInstance(card[key], (int, float))
            self.assertTrue(card.get("director_shot"))
            self.assertIsInstance(card["params"], dict)
            self.assertIsInstance(card["assets"], dict)
        self.assertEqual(len(ids), 2)
        image, video = (self.stage_card(project, stage) for stage in ("image", "video"))
        self.assertEqual(image["params"]["prompt"], "城市日出")
        self.assertEqual(image["name"], "开场")
        self.assertEqual(project["edges"], [])
        restored = await self.get_project()
        for stage in ("image", "video"):
            self.assertEqual(self.stage_card(restored, stage)["id"], self.stage_card(project, stage)["id"])

    async def test_empty_and_single_stage_shots_never_create_companions(self):
        empty, image, video = (legacy.shot(sid) for sid in ("empty", "image", "video"))
        for item in (empty, video):
            item["image"] = {"capability": "", "params": {}}
        for item in (empty, image):
            item["video"] = {"capability": "", "params": {}}
        project = await self.link([empty, image, video])
        self.assertEqual(len(project["cards"]), 2)
        self.assertEqual(project["edges"], [])
        for item in project["director"]["shots"]:
            for phase in (item["image"], item["video"]):
                if not phase["capability"]:
                    self.assertNotIn("card", phase)
        self.assertEqual(self.stage_card(project, "image", "image")["params"], {"prompt": "城市日出"})
        self.assertEqual(self.stage_card(project, "video", "video")["params"], {"prompt": "城市日出"})
        await self.save(self.request_document(project))
        self.assertEqual(len(self.read_project()["cards"]), 2)

    async def test_new_cards_preserve_canvas_defaults_and_explicit_prompt(self):
        self.caps["zimage_t2i"]["imageControls"] = True
        item = legacy.shot()
        item["description"] = ""
        item["video"]["capability"] = ""
        project = await self.link([item])
        self.assertEqual(self.stage_card(project)["params"], {})
        supplied = legacy.shot("supplied")
        supplied["image"]["params"] = {"prompt": "明确提示词"}
        supplied["video"]["capability"] = ""
        project = await self.link([project["director"]["shots"][0], supplied])
        card = self.stage_card(project, "image", "supplied")
        self.assertEqual(card["params"], {"prompt": "明确提示词"})
        self.assertNotIn("image_ratio", card["params"])
        self.assertNotIn("image_clarity", card["params"])

    async def test_video_only_shot_projects_canvas_name_and_effective_prompt(self):
        item = legacy.shot()
        item["image"]["capability"] = ""
        project = await self.link([item])
        card = self.stage_card(project, "video")
        card.update(name="视频镜头", params={}, opt={"prompt": "视频优化提示词"},
                    optUse={"prompt": True})
        project = await self.canvas_save(project)
        item = project["director"]["shots"][0]
        self.assertEqual(item["title"], "视频镜头")
        self.assertEqual(item["description"], "视频优化提示词")
        body = self.request_document(project)
        body["shots"][0].update(title="导演视频标题", description="导演视频描述")
        saved = (await (await self.save(body)).json())["project"]
        card = self.stage_card(saved, "video")
        self.assertEqual(card["name"], "导演视频标题")
        self.assertEqual(card["params"]["prompt"], "导演视频描述")
        self.assertFalse(card["optUse"]["prompt"])

    async def test_replay_rejected_and_fresh_repeat_save_keeps_card_ids_and_edges(self):
        initial = self.request_document(shots=[legacy.shot()])
        project = await self.link()
        ids = [card["id"] for card in project["cards"]]
        edges = copy.deepcopy(project["edges"])
        await self.assert_rejected(initial, 409)
        for _ in range(2):
            response = await self.save(self.request_document(project))
            project = (await response.json())["project"]
            self.assertEqual([card["id"] for card in project["cards"]], ids)
            self.assertEqual(project["edges"], edges)
            self.assertEqual(len(project["cards"]), 2)

    async def test_canvas_and_director_revisions_each_conflict_without_partial_write(self):
        project = await self.link()
        for canvas_rev, director_rev in ((0, 1), (2, 1), (1, 0), (1, 2)):
            with self.subTest(canvas_rev=canvas_rev, director_rev=director_rev):
                body = self.request_document(project, [legacy.shot(), legacy.shot("new-shot")])
                body.update(canvas_rev=canvas_rev, rev=director_rev)
                await self.assert_rejected(body, 409)

    async def test_concurrent_linked_saves_have_one_atomic_winner(self):
        bodies = [self.request_document(shots=[legacy.shot(sid)]) for sid in ("plan-a", "plan-b")]
        responses = await self.run_queued_writes([
            lambda body=body: self.client.put(self.url, json=body) for body in bodies
        ])
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        disk = self.read_project()
        self.assertEqual(len(disk["cards"]), 2)
        self.assertEqual(disk["edges"], [])
        self.assertEqual(disk["rev"], 1)
        self.assertEqual(disk["director"]["rev"], 1)

    async def test_import_creates_separate_shots_without_cards_edges_or_automatic_scan(self):
        image = await self.create_import_card()
        video = await self.create_import_card("existing-video", "video", params={},
                                              opt={"prompt": "优化视频"}, optUse={"prompt": True})
        ordinary = await self.create_import_card("not-requested")
        before = self.seed_project(groups=[{"id": "keep"}], view={"x": 1, "y": 2, "k": 1},
                                   edges=[{"from": image["id"], "to": video["id"], "slot": "images[0]"}])
        body = self.import_body([video["id"], image["id"]])
        with mock.patch.object(controller_app, "broadcast_collaboration", wraps=controller_app.broadcast_collaboration) as broadcast:
            payload = await (await self.import_cards(body)).json()
        self.assertEqual(payload["rev"], 1)
        self.assertEqual(payload["canvas_rev"], body["canvas_rev"] + 1)
        self.assertEqual(payload["director"], payload["project"]["director"])
        self.assertEqual(payload["project"], controller_app.collaboration_project(self.read_project()))
        broadcast.assert_awaited_once()
        self.assertEqual(broadcast.call_args.args[2]["type"], "project-changed")
        self.assertTrue(broadcast.call_args.kwargs["authorize"])
        project = payload["project"]
        self.assertEqual(project["edges"], before["edges"])
        self.assertEqual(project["groups"], before["groups"])
        self.assertEqual(self.read_project()["view"], before["view"])
        self.assertEqual(len(project["cards"]), 3)
        self.assertEqual(len(project["director"]["shots"]), 2)
        for item, original, stage in zip(project["director"]["shots"], (video, image), ("video", "image")):
            self.assertEqual(item[stage]["card"], original["id"])
            other = "image" if stage == "video" else "video"
            self.assertEqual(item[other], {"capability": "", "params": {}})
            card = self.stage_card(project, stage, item["id"])
            self.assertEqual({k: v for k, v in card.items() if not k.startswith("director_")}, original)
        self.assertEqual(project["director"]["shots"][0]["description"], "优化视频")
        unlinked = next(card for card in project["cards"] if card["id"] == ordinary["id"])
        self.assertFalse(unlinked.get("director_shot"))
        self.assertEqual((await self.get_project())["director"], payload["director"])
        await self.save(self.request_document(project))
        self.assertEqual(len(self.read_project()["cards"]), 3)
        await self.import_cards(self.import_body([image["id"]]), 400)

    async def test_import_attaches_only_one_compatible_stage_to_existing_shot(self):
        item = legacy.shot()
        item["video"]["capability"] = ""
        project = await self.link([item])
        video = await self.create_import_card("existing-video", "video")
        body = self.import_body([video["id"]], shot="shot-1")
        payload = await (await self.import_cards(body)).json()
        self.assertEqual(len(payload["director"]["shots"]), 1)
        self.assertEqual(payload["rev"], 2)
        self.assertEqual(len(payload["project"]["cards"]), 2)
        self.assertEqual(payload["project"]["edges"], project["edges"])
        self.assertEqual(self.stage_card(payload["project"], "video")["id"], video["id"])
        spare = await self.create_import_card("spare-video", "video")
        await self.import_cards(self.import_body([spare["id"]], shot="shot-1"), 400)
        await self.import_cards(self.import_body([spare["id"]], shot="missing-shot"), 404)

    async def test_import_batch_rejects_missing_foreign_duplicate_and_unsupported_cards_atomically(self):
        card = await self.create_import_card()
        self.own_project("other")
        await self.create_import_card("tool", cap="image_tool")
        await self.create_import_card("unavailable", cap="missing_graph")
        await self.create_import_card("wrong-type", type="card_text")
        await self.create_import_card("unknown-cap", cap="unknown")
        await self.create_import_card("readonly-card", readonly=True)
        await self.create_import_card("locked-card", locked=True)
        other = self.root / "data" / "projects" / "other.json"
        foreign = json.loads(other.read_text(encoding="utf-8"))
        foreign["cards"] = [{**card, "id": "foreign"}]
        other.write_text(json.dumps(foreign), encoding="utf-8")
        foreign_before = other.read_bytes()
        for bad, status in (("missing", 404), ("foreign", 404), (card["id"], 400),
                            ("tool", 400), ("unavailable", 400), ("wrong-type", 400), ("unknown-cap", 400),
                            ("readonly-card", 403), ("locked-card", 403)):
            with self.subTest(card=bad):
                await self.import_cards(self.import_body([card["id"], bad]), status)
        self.assertEqual(other.read_bytes(), foreign_before)
        self.assertNotIn("director", self.read_project())

    async def test_import_schema_and_both_revisions_are_required(self):
        card = await self.create_import_card()
        valid = self.import_body([card["id"]])
        cases = [None, [], {}, {**valid, "extra": 1}, {**valid, "cards": []},
                 {**valid, "cards": [None]}, {**valid, "cards": "not a list"},
                 {**valid, "cards": ["../bad"]}, {**valid, "cards": [card["id"]] * 201},
                 {**valid, "shot": None}, {**valid, "shot": "../bad"}]
        for key in ("rev", "canvas_rev", "cards"):
            invalid = copy.deepcopy(valid)
            invalid.pop(key)
            cases.append(invalid)
        for key in ("rev", "canvas_rev"):
            for value in (True, False, -1, "0", None, 0.5, {}):
                cases.append({**valid, key: value})
        for invalid in cases:
            with self.subTest(body=invalid):
                await self.import_cards(invalid, 400)
        for key in ("rev", "canvas_rev"):
            for value in (valid[key] - 1, valid[key] + 1):
                if value >= 0:
                    await self.import_cards({**valid, key: value}, 409)
        await self.import_cards(valid)
        await self.import_cards(valid, 409)
        fresh = self.import_body([card["id"]])
        await self.import_cards({**fresh, "rev": 0}, 409)
        await self.import_cards({**fresh, "canvas_rev": fresh["canvas_rev"] - 1}, 409)

    async def test_import_to_shot_rejects_multiple_cards_or_incompatible_capability(self):
        item = legacy.shot()
        item["video"]["capability"] = ""
        await self.save(legacy.director([item]))
        image = await self.create_import_card(cap="zimage_i2i")
        second = await self.create_import_card("second")
        await self.import_cards(self.import_body([image["id"], second["id"]], shot="shot-1"), 400)
        await self.import_cards(self.import_body([image["id"]], shot="shot-1"), 400)
        await self.import_cards(self.import_body([second["id"]], shot="shot-1"))
        self.assertEqual(len(self.read_project()["cards"]), 2, "导入不能创建另一阶段")

    async def test_import_concurrency_has_one_winner_and_no_duplicate_shots(self):
        card = await self.create_import_card()
        body = self.import_body([card["id"]])
        responses = await self.run_queued_writes([
            lambda: self.client.post(self.url + "/import", json=body),
            lambda: self.client.post(self.url + "/import", json=body),
        ])
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        project = self.read_project()
        self.assertEqual(len(project["cards"]), 1)
        self.assertEqual(len(project["director"]["shots"]), 1)
        self.assertEqual(project["rev"], body["canvas_rev"] + 1)
        self.assertEqual(project["director"]["rev"], 1)

    async def test_concurrent_canvas_save_and_import_cannot_overwrite_each_other(self):
        card = await self.create_import_card()
        body = self.import_body([card["id"]])
        responses = await self.run_queued_writes([
            lambda: self.client.post(self.url + "/import", json=body),
            lambda: self.client.put("/api/projects/p", json={"rev": body["canvas_rev"], "cards": [], "edges": []}),
        ])
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        project = self.read_project()
        self.assertEqual(project["rev"], body["canvas_rev"] + 1)
        if responses[0].status == 200:
            self.assertEqual(len(project["cards"]), 1)
            self.assertEqual(len(project["director"]["shots"]), 1)
        else:
            self.assertEqual(project["cards"], [])
            self.assertNotIn("director", project)

    async def test_import_malformed_json_is_rejected_without_writing(self):
        before = self.project_path.read_bytes()
        response = await self.client.post(self.url + "/import", data='{"rev":',
                                          headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)

    async def test_import_rejects_corrupt_duplicate_canvas_ids_and_membership_markers(self):
        card = await self.create_import_card()
        before = self.read_project()
        for cards in ([card, copy.deepcopy(card)],
                      [{**card, "director_shot": "unknown"}],
                      [{**card, "director_stage": "image"}]):
            self.seed_project(cards=cards)
            await self.import_cards(self.import_body([card["id"]]), 400)
        self.seed_project(**before)

    async def test_import_respects_maximum_shot_count(self):
        await self.create_import_card()
        self.seed_project(director=legacy.director([legacy.shot("s-" + str(i)) for i in range(200)]))
        await self.import_cards(self.import_body(["existing-image"]), 400)

    async def test_import_authentication_csrf_permissions_and_locked_projects(self):
        card = await self.create_import_card()
        body = self.import_body([card["id"]])
        self.client.session.headers.clear()
        for headers in ({"Origin": self.origin},
                        {"Origin": self.origin, "X-CSRF-Token": "wrong"},
                        {"X-CSRF-Token": self.headers["X-CSRF-Token"]},
                        {**self.headers, "Origin": "https://foreign.invalid"},
                        {**self.headers, "Sec-Fetch-Site": "cross-site"}):
            await self.import_cards(body, 403, headers=headers)
        self.client.session.headers.update(self.headers)
        self.seed_project(locked=True)
        await self.import_cards(body, 403)
        self.seed_project(locked=False)
        reader = self.auth.create_user("import-reader", auth_support.PASSWORD)
        self.auth.set_grant(reader["id"], self.admin["id"], "read")
        await self.switch_user("import-reader")
        await self.import_cards(body, 403)
        self.auth.create_user("import-stranger", auth_support.PASSWORD)
        await self.switch_user("import-stranger")
        await self.import_cards(body, 404)
        self.client.session.cookie_jar.clear()
        await self.import_cards(body, 401)
        operator = self.auth.create_user("import-operator", auth_support.PASSWORD)
        self.auth.set_grant(operator["id"], self.admin["id"], "operate")
        await self.switch_user("import-operator")
        payload = await (await self.import_cards(body)).json()
        self.assertEqual(payload["project"]["cards"][0]["created_by"], self.admin["id"])
        self.submit.assert_not_awaited()

    async def test_import_permission_is_rechecked_before_write(self):
        card = await self.create_import_card()
        original = controller_app.require_project
        calls = 0

        async def revoked(request, pid, operate=False):
            nonlocal calls
            calls += 1
            if calls == 2:
                from aiohttp import web
                raise web.HTTPForbidden(text="权限已撤销")
            return await original(request, pid, operate=operate)

        with mock.patch.object(controller_app, "require_project", side_effect=revoked):
            await self.import_cards(self.import_body([card["id"]]), 403)
        self.assertEqual(calls, 2)

    async def test_import_rejects_foreign_resources_and_foreign_or_missing_jobs(self):
        self.own_project("other")
        self.register_asset("foreign.png", "other")
        local = await self.create_import_card()
        self.register_job("foreign-job", "other")
        for jid in ("foreign-job", "missing-job"):
            card = await self.create_import_card("job-" + jid, job=jid, history=[{"job": jid, "outputs": []}])
            await self.import_cards(self.import_body([local["id"], card["id"]]), 400)
        foreign = await self.create_import_card("foreign-asset")
        foreign["assets"] = {"images[0]": legacy.reference("foreign.png")}
        project = self.read_project()
        project["cards"] = [foreign if card["id"] == foreign["id"] else card for card in project["cards"]]
        self.seed_project(cards=project["cards"])
        await self.import_cards(self.import_body([local["id"], foreign["id"]]), 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "foreign.png", "p"))

    async def test_import_persists_trusted_cached_history_before_cache_eviction(self):
        card = await self.create_import_card()
        output = self.snapshot_job("import-completion", card=card["id"])
        self.seed_project(cards=[{**card, "job": "import-completion", "status": "queued"}])
        payload = await (await self.import_cards(self.import_body([card["id"]]))).json()
        sid = payload["director"]["shots"][0]["id"]
        linked = self.stage_card(self.read_project(), "image", sid)
        self.assertEqual(linked["status"], "done")
        self.assertEqual(linked["outputs"], [output])
        self.assertEqual(linked["history"][0]["job"], "import-completion")
        self.assertEqual(linked["history"][0]["outputs"], [output])
        controller_app.JOBS.clear()
        restored = await self.get_project()
        self.assertEqual(self.stage_card(restored, "image", sid)["history"], linked["history"])
        await self.save(self.request_document(restored))
        self.assertEqual(self.stage_card(self.read_project(), "image", sid)["history"], linked["history"])

    async def test_import_preserves_archived_history_and_linked_generation_history(self):
        card = await self.create_import_card()
        output = self.snapshot_job("import-archived", card=card["id"])
        history = [{"job": "import-archived", "outputs": [output], "seed": 77, "ts": 123}]
        self.seed_project(cards=[{**card, "job": "import-archived", "history": history,
                                 "outputs": [output], "status": "done"}])
        controller_app.JOBS.clear()
        payload = await (await self.import_cards(self.import_body([card["id"]]))).json()
        project = payload["project"]
        sid = payload["director"]["shots"][0]["id"]
        linked = self.stage_card(project, "image", sid)
        self.assertEqual(linked["history"], history)
        self.assertEqual(linked["outputs"], [output])
        self.assertEqual(payload["director"]["shots"][0]["history"],
                         [{"job": "import-archived", "stage": "image", "outputs": [output]}])
        await self.save(self.request_document(project))
        response = await self.client.post("/api/generate", json={
            "project": "p", "card": card["id"], "capability": card["cap"],
            "params": card["params"], "assets": {},
        })
        self.assertEqual(response.status, 200, await response.text())
        self.assertEqual(self.stage_card(self.read_project(), "image", sid)["history"], history)

    async def test_reference_atomically_adds_edge_asset_projection_revisions_and_broadcast(self):
        project, _ = await self.prepare_reference(index=1)
        video = self.stage_card(project, "video")
        video["assets"] = {
            "images[1]": self.register_upload("keep-image.png"),
            "audios[0]": self.register_upload("keep-audio.wav", kind="audio"),
            "videos[0]": self.register_upload("keep-video.mp4", kind="video"),
        }
        project["edges"] = [{"from": self.stage_card(project)["id"], "to": video["id"],
                             "slot": "@text", "custom": {"keep": True}}]
        project = await self.canvas_save(project)
        self.seed_project(view={"x": 17, "y": -20, "k": 1}, custom={"keep": [1, 2]})
        before = self.read_project()
        body = self.reference_body(project)
        original_body = copy.deepcopy(body)
        with mock.patch.object(controller_app, "broadcast_collaboration",
                               wraps=controller_app.broadcast_collaboration) as broadcast:
            payload = await (await self.reference_request(body)).json()
        self.assertTrue(payload["ok"])
        self.assertEqual(body, original_body)
        self.assertEqual(payload["rev"], body["rev"] + 1)
        self.assertEqual(payload["canvas_rev"], body["canvas_rev"] + 1)
        disk = self.read_project()
        self.assertEqual(payload["project"], controller_app.collaboration_project(disk))
        self.assertEqual(payload["director"], disk["director"])
        self.assertEqual(payload["updated"], disk["updated"])
        self.assertEqual(disk["rev"], payload["canvas_rev"])
        self.assertEqual(disk["director"]["rev"], payload["rev"])
        expected_edge = {"from": self.stage_card(before)["id"], "to": video["id"],
                         "slot": body["slot"], "slots": [body["slot"]],
                         "version": body["version"]}
        self.assertEqual(disk["edges"], before["edges"] + [expected_edge])
        expected_assets = {**video["assets"], body["slot"]: body["asset"]}
        self.assertEqual(self.stage_card(disk, "video")["assets"], expected_assets)
        self.assertEqual(disk["director"]["shots"][0]["video"]["assets"], expected_assets)
        self.assertEqual(self.stage_card(disk), self.stage_card(before))
        self.assertEqual({k: v for k, v in self.stage_card(disk, "video").items() if k != "assets"},
                         {k: v for k, v in video.items() if k != "assets"})
        for key in ("groups", "view", "custom"):
            self.assertEqual(disk.get(key), before.get(key))
        broadcast.assert_awaited_once()
        self.assertEqual(broadcast.call_args.args[1], "p")
        self.assertEqual(broadcast.call_args.args[2],
                         {"type": "project-changed", "project": payload["project"]})
        self.assertTrue(broadcast.call_args.kwargs["authorize"])
        self.assertEqual((await self.get_project())["director"], payload["director"])
        self.submit.assert_not_awaited()

    async def test_reference_uses_adopted_old_output_despite_later_done_job(self):
        project, old = await self.prepare_reference(later_job=True)
        payload = await (await self.reference_request(self.reference_body(project))).json()
        for restored in (payload["project"], self.read_project(), await self.get_project()):
            image = self.stage_card(restored)
            self.assertEqual(image["job"], "reference-latest")
            self.assertEqual(image["outputs"], [old])
            self.assertEqual(image["director_selected"], {"job": "reference-old", "index": 0})
            self.assertEqual(restored["edges"][-1]["version"], image["director_selected"])
            self.assertEqual(restored["director"]["shots"][0]["selected"]["image"],
                             image["director_selected"])
            self.assertEqual(self.stage_card(restored, "video")["assets"]["images[0]"],
                             legacy.reference("storyboard-reference.png"))
        controller_app.JOBS.clear()
        self.assertEqual(self.stage_card(await self.get_project())["outputs"], [old])

    async def test_reference_accepts_registered_archival_job_after_cache_eviction(self):
        project, old = await self.prepare_reference()
        controller_app.JOBS.clear()
        payload = await (await self.reference_request(self.reference_body(project))).json()
        self.assertEqual(self.stage_card(payload["project"])["outputs"], [old])
        self.assertEqual(payload["project"]["edges"][-1]["version"],
                         {"job": "reference-old", "index": 0})
        self.assertEqual(self.stage_card(await self.get_project(), "video")["assets"],
                         {"images[0]": legacy.reference("storyboard-reference.png")})

    async def test_reference_migrated_legacy_history_preserves_job_and_billing_identity(self):
        from costs import CostLedger

        item = legacy.shot()
        jid = "reference-legacy-shot-job"
        output = self.snapshot_job(jid, card=item["id"])
        controller_app.JOBS[jid].update(projectName="历史项目名", cardName="历史镜头名")
        original_job = copy.deepcopy(controller_app.JOBS[jid])
        original_acl = copy.deepcopy(self.auth.get_job(jid))
        ledger = CostLedger(self.root / "data" / "reference-costs.db", ROOT / "pricing.json")
        self.addCleanup(ledger.close)
        self.application["costs"] = ledger
        ledger.record_job(original_job, historical=True)
        original_bill = [dict(row) for row in ledger.db.execute("SELECT * FROM cost_events ORDER BY job_id")]
        self.assertEqual(len(original_bill), 1)
        self.assertEqual(original_bill[0]["card_id"], item["id"])
        choice = {"job": jid, "index": 0}
        item["history"] = [{"job": jid, "stage": "image", "outputs": [output]}]
        item["selected"] = {"image": choice}
        with mock.patch.object(controller_app, "save_jobs") as save_jobs:
            await self.save(legacy.director([item]))
            project = (await (await self.save(self.request_document())).json())["project"]
            image = self.stage_card(project)
            self.assertNotEqual(image["id"], original_job["card"])
            self.assertEqual(image["director_selected"], choice)
            self.assertEqual(next(h for h in image["history"] if h["job"] == jid)["outputs"], [output])
            self.register_upload("storyboard-reference.png")
            migrated_bytes = self.project_path.read_bytes()
            for archived in (False, True):
                with self.subTest(archived=archived):
                    self.project_path.write_bytes(migrated_bytes)
                    if archived:
                        controller_app.JOBS.clear()
                    payload = await (await self.reference_request(self.reference_body(project))).json()
                    for source in (payload["project"], self.read_project(), await self.get_project()):
                        card = self.stage_card(source)
                        self.assertEqual(card["outputs"], [output])
                        self.assertEqual(card["director_selected"], choice)
                        self.assertEqual(next(h for h in card["history"] if h["job"] == jid)["outputs"], [output])
                        self.assertEqual(source["edges"], [{"from": image["id"],
                            "to": self.stage_card(project, "video")["id"], "slot": "images[0]",
                            "slots": ["images[0]"], "version": choice}])
                        self.assertEqual(self.stage_card(source, "video")["assets"],
                                         {"images[0]": legacy.reference("storyboard-reference.png")})
                    if not archived:
                        self.assertEqual(controller_app.JOBS[jid], original_job)
                    else:
                        self.assertNotIn(jid, controller_app.JOBS, "引用不能重建或改写归档任务")
                    self.assertEqual(self.auth.get_job(jid), original_acl)
                    self.assertEqual([dict(row) for row in ledger.db.execute(
                        "SELECT * FROM cost_events ORDER BY job_id")], original_bill,
                        "迁移和引用不能重写历史账单的任务、卡片身份或费用")
            save_jobs.assert_not_called()
        self.submit.assert_not_awaited()

    async def test_reference_explicitly_adopts_known_fallback_when_image_selection_absent(self):
        project, output = await self.prepare_reference()
        controller_app.JOBS.clear()
        image = self.stage_card(project)
        image.pop("director_selected", None)
        image["outputs"] = []
        project["director"]["shots"][0]["selected"] = {}
        self.seed_project(cards=project["cards"], director=project["director"])
        restored = await self.get_project()
        self.assertNotIn("image", restored["director"]["shots"][0]["selected"])
        choice = {"job": "reference-old", "index": 0}
        initial_reference = {"rev": restored["director"]["rev"], "canvas_rev": restored["rev"],
                             "shot": "shot-1", "version": choice, "slot": "images[0]",
                             "asset": legacy.reference("storyboard-reference.png")}
        await self.reference_request(initial_reference, 400)
        body = self.request_document(restored)
        body["shots"][0]["selected"]["image"] = choice
        adopted = (await (await self.save(body)).json())["project"]
        self.assertEqual(self.stage_card(adopted)["outputs"], [output])
        self.assertEqual(self.stage_card(adopted)["director_selected"], choice)
        await self.reference_request(initial_reference, 409)
        payload = await (await self.reference_request(self.reference_body(adopted))).json()
        self.assertEqual(payload["project"]["edges"][-1]["version"], choice)
        self.assertEqual(self.stage_card(payload["project"], "video")["assets"],
                         {"images[0]": initial_reference["asset"]})
        self.submit.assert_not_awaited()

    async def test_reference_rejects_asset_and_edge_owned_slots_without_disk_changes(self):
        project, _ = await self.prepare_reference()
        baseline = copy.deepcopy(project)
        image, video = (self.stage_card(project, stage) for stage in ("image", "video"))
        occupied = self.register_upload("occupied.png")
        cases = [({"images[0]": occupied}, []),
                 ({}, [{"from": image["id"], "to": video["id"], "slot": "images[0]"}]),
                 ({}, [{"from": video["id"], "to": video["id"], "slot": "images[1]",
                        "slots": ["images[1]", "images[0]"]}])]
        for assets, edges in cases:
            with self.subTest(assets=assets, edges=edges):
                project = copy.deepcopy(baseline)
                self.stage_card(project, "video")["assets"] = assets
                self.seed_project(cards=project["cards"], edges=edges)
                with mock.patch.object(controller_app, "broadcast_collaboration") as broadcast:
                    await self.reference_request(self.reference_body(project), 409)
                broadcast.assert_not_awaited()

    async def test_reference_rejects_wrong_or_inactive_video_image_slot(self):
        project, _ = await self.prepare_reference()
        for slot in ("images[1]", "audios[0]", "videos[0]", "prompt", "@text", "unknown"):
            with self.subTest(slot=slot):
                await self.reference_request(self.reference_body(project, slot=slot), 400)
        # 只以活动 capability 的 inputs 为准，不以另一视频模式的槽位为准。
        self.caps["minimax_h3_flf2v"]["inputs"].append(
            {"key": "images[1]", "type": "image", "target": {"node": "1", "input": "last"}})
        await self.reference_request(self.reference_body(project, slot="images[1]"), 400)

    async def test_reference_rejects_duplicate_version_even_in_another_empty_slot(self):
        project, _ = await self.prepare_reference()
        self.caps["minimax_h3_i2v"]["inputs"].append(
            {"key": "images[1]", "type": "image", "target": {"node": "1", "input": "last"}})
        body = self.reference_body(project)
        payload = await (await self.reference_request(body)).json()
        fresh = self.reference_body(payload["project"])
        await self.reference_request(fresh, 409)
        await self.reference_request({**fresh, "slot": "images[1]"}, 409)
        self.assertEqual(len(self.read_project()["edges"]), 1)
        self.assertNotIn("images[1]", self.stage_card(self.read_project(), "video")["assets"])

    async def test_reference_conflicts_on_either_revision_and_replay(self):
        project, _ = await self.prepare_reference()
        body = self.reference_body(project)
        for key in ("rev", "canvas_rev"):
            for value in (body[key] - 1, body[key] + 1):
                with self.subTest(revision=key, value=value):
                    await self.reference_request({**body, key: value}, 409)
        await self.reference_request(body)
        await self.reference_request(body, 409)

    async def test_reference_concurrent_requests_have_one_atomic_winner(self):
        project, _ = await self.prepare_reference()
        body = self.reference_body(project)
        bodies = [body, {**body, "asset": self.register_upload("queued-other-reference.png")}]
        before = self.project_path.read_bytes()
        lock = legacy.ObservedLock()
        self.application["project_locks"]["p"] = lock
        await lock.acquire()
        held_by_test = True
        tasks = [asyncio.create_task(self.client.post(self.url + "/reference", json=request_body))
                 for request_body in bodies]
        try:
            await asyncio.wait_for(lock.both_waiting.wait(), timeout=5)
            self.assertEqual(self.project_path.read_bytes(), before)
            lock.release()
            held_by_test = False
            responses = await asyncio.wait_for(asyncio.gather(*tasks), timeout=5)
        finally:
            if held_by_test:
                lock.release()
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        winner = next(i for i, response in enumerate(responses) if response.status == 200)
        winning_body = bodies[winner]
        payload = await responses[winner].json()
        disk = self.read_project()
        self.assertEqual(disk["rev"], body["canvas_rev"] + 1)
        self.assertEqual(disk["director"]["rev"], body["rev"] + 1)
        expected_edge = {"from": self.stage_card(project)["id"],
                         "to": self.stage_card(project, "video")["id"],
                         "slot": body["slot"], "slots": [body["slot"]], "version": body["version"]}
        expected_assets = {body["slot"]: winning_body["asset"]}
        for source in (disk, payload["project"], await self.get_project()):
            self.assertEqual(source["edges"], [expected_edge], "并发引用只能产生一条连线")
            self.assertEqual(self.stage_card(source, "video")["assets"], expected_assets,
                             "失败请求不能覆盖成功请求的素材")
            self.assertEqual(source["director"]["shots"][0]["video"]["assets"], expected_assets)
        self.assertNotEqual(winning_body["asset"], bodies[1 - winner]["asset"])

    async def test_reference_requires_strict_body_and_version_schema(self):
        project, _ = await self.prepare_reference()
        valid = self.reference_body(project)
        cases = [None, [], {}, {**valid, "extra": 1}]
        for key in valid:
            invalid = copy.deepcopy(valid)
            invalid.pop(key)
            cases.append(invalid)
        for key in ("rev", "canvas_rev"):
            for value in (True, False, -1, "0", None, 0.5, {}, []):
                cases.append({**valid, key: value})
        for key in ("shot", "slot"):
            for value in (None, True, 1, [], {}, "", "x" * 129):
                cases.append({**valid, key: value})
        for version in (None, [], {}, {"job": "reference-old"}, {"index": 0},
                        {"job": "reference-old", "index": 0, "extra": 1}):
            cases.append({**valid, "version": version})
        for key, values in (("job", (None, True, 1, [], {}, "", "x" * 129)),
                            ("index", (None, True, False, -1, "0", 0.5, {}, []))):
            for value in values:
                cases.append({**valid, "version": {**valid["version"], key: value}})
        for asset in (None, [], {}, "chouka/storyboard-reference.png",
                      {**valid["asset"], "kind": "video"},
                      {**valid["asset"], "ref": ""}, {**valid["asset"], "url": None}):
            cases.append({**valid, "asset": asset})
        for body in cases:
            with self.subTest(body=body):
                await self.reference_request(body, 400)

    async def test_reference_malformed_json_is_atomic_400(self):
        await self.prepare_reference()
        before = self.project_path.read_bytes()
        response = await self.client.post(self.url + "/reference", data='{"rev":',
                                          headers={"Content-Type": "application/json"})
        self.assertEqual(response.status, 400, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)

    async def test_reference_requires_current_selection_and_known_image_history_output(self):
        project, _ = await self.prepare_reference(later_job=True)
        body = self.reference_body(project)
        await self.reference_request({**body, "version": {"job": "reference-latest", "index": 0}}, 400)
        await self.reference_request({**body, "version": {"job": "reference-old", "index": 1}}, 400)
        await self.reference_request({**body, "version": {"job": "missing-job", "index": 0}}, 400)
        unrelated = self.snapshot_job("reference-unrelated", card="unrelated-card")
        await self.reference_request({**body, "version": {"job": "reference-unrelated", "index": 0}}, 400)
        controller_app.JOBS.clear()
        baseline = copy.deepcopy(project)
        for case in ("no-selection", "unknown-history", "non-image-output", "unrelated-source"):
            with self.subTest(case=case):
                damaged = copy.deepcopy(baseline)
                card = self.stage_card(damaged)
                if case == "no-selection":
                    card.pop("director_selected", None)
                    card["outputs"] = []
                    damaged["director"]["shots"][0]["selected"] = {}
                elif case == "unknown-history":
                    card["history"] = []
                    damaged["director"]["shots"][0]["history"] = []
                elif case == "non-image-output":
                    entry = next(h for h in card["history"] if h["job"] == body["version"]["job"])
                    entry["outputs"][0]["kind"] = "video"
                else:
                    card["director_selected"] = {"job": "reference-unrelated", "index": 0}
                    card["outputs"] = [unrelated]
                    damaged["director"]["shots"][0]["selected"]["image"] = card["director_selected"]
                self.seed_project(cards=damaged["cards"], director=damaged["director"])
                request_body = {**body, "version": card.get("director_selected", body["version"])}
                await self.reference_request(request_body, 400)

    async def test_reference_requires_existing_same_shot_image_and_video_nodes(self):
        project, _ = await self.prepare_reference()
        body = self.reference_body(project)
        await self.reference_request({**body, "shot": "missing-shot"}, 404)
        for stage in ("image", "video"):
            for case in ("deleted", "other-shot", "wrong-stage", "missing-link"):
                with self.subTest(stage=stage, case=case):
                    damaged = copy.deepcopy(project)
                    card = self.stage_card(damaged, stage)
                    if case == "deleted":
                        damaged["cards"] = [c for c in damaged["cards"] if c["id"] != card["id"]]
                    elif case == "other-shot":
                        card["director_shot"] = "other-shot"
                    elif case == "wrong-stage":
                        card["director_stage"] = "video" if stage == "image" else "image"
                    else:
                        damaged["director"]["shots"][0][stage].pop("card")
                        card.pop("director_shot")
                        card.pop("director_stage")
                    self.seed_project(cards=damaged["cards"], director=damaged["director"])
                    await self.reference_request(body, 409)

    async def test_reference_rejects_foreign_missing_and_mixed_resource_locators(self):
        project, _ = await self.prepare_reference()
        owner = self.auth.create_user("reference-resource-owner", auth_support.PASSWORD)
        self.own_project("other", owner=owner)
        foreign = self.register_upload("reference-foreign.png", "other")
        local = legacy.reference("storyboard-reference.png")
        for asset in (foreign, legacy.reference("reference-missing.png"),
                      {**local, "url": foreign["url"]}, {**foreign, "url": local["url"]}):
            with self.subTest(asset=asset):
                await self.reference_request(self.reference_body(project, asset=asset), 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "reference-foreign.png", "p"))
        self.assertTrue(self.access.authorize(owner["id"], "upload", "reference-foreign.png", "other"))
        external = {**local, "ref": "https://foreign.invalid/a.png",
                    "url": "https://foreign.invalid/a.png"}
        await self.reference_request(self.reference_body(project, asset=external), 400)

    async def test_reference_rejects_foreign_jobs_including_archival_local_output_snapshot(self):
        project, old = await self.prepare_reference()
        self.own_project("other")
        foreign = self.snapshot_job("reference-foreign-job", pid="other")
        other_path = self.root / "data" / "projects" / "other.json"
        other_before = other_path.read_bytes()
        for archived in (False, True):
            with self.subTest(archived=archived):
                if archived:
                    controller_app.JOBS.clear()
                for output in (foreign, old):
                    # 本地资源快照也不能使外项目任务获得合法的项目归属。
                    damaged = copy.deepcopy(project)
                    card = self.stage_card(damaged)
                    choice = {"job": "reference-foreign-job", "index": 0}
                    card.update(job=choice["job"], outputs=[output], director_selected=choice,
                                history=[{"job": choice["job"], "outputs": [output]}])
                    damaged["director"]["shots"][0].update(
                        selected={"image": choice},
                        history=[{"job": choice["job"], "stage": "image", "outputs": [output]}])
                    self.seed_project(cards=damaged["cards"], director=damaged["director"])
                    await self.reference_request(self.reference_body(damaged), 400)
        self.assertEqual(other_path.read_bytes(), other_before)
        self.assertFalse(self.access.authorize(self.admin["id"], "artifact",
                                               "reference-foreign-job/result.png", "p"))

    async def test_reference_rejects_foreign_resource_in_selected_local_job_history(self):
        project, _ = await self.prepare_reference()
        self.own_project("other")
        foreign = self.snapshot_job("reference-foreign-output", pid="other")
        controller_app.JOBS.clear()
        card = self.stage_card(project)
        card["history"][0]["outputs"] = [foreign]
        card["outputs"] = [foreign]
        project["director"]["shots"][0]["history"] = [
            {"job": "reference-old", "stage": "image", "outputs": [foreign]}]
        self.seed_project(cards=project["cards"], director=project["director"])
        await self.reference_request(self.reference_body(project), 404)

    async def test_reference_authentication_csrf_permissions_and_locked_project(self):
        project, _ = await self.prepare_reference()
        body = self.reference_body(project)
        self.client.session.headers.clear()
        for headers in ({"Origin": self.origin},
                        {"Origin": self.origin, "X-CSRF-Token": "wrong"},
                        {"X-CSRF-Token": self.headers["X-CSRF-Token"]},
                        {**self.headers, "Origin": "https://foreign.invalid"},
                        {**self.headers, "Sec-Fetch-Site": "cross-site"}):
            with self.subTest(headers=headers):
                await self.reference_request(body, 403, headers=headers)
        self.client.session.headers.update(self.headers)
        self.seed_project(locked=True)
        await self.reference_request(body, 403)
        self.seed_project(locked=False)
        reader = self.auth.create_user("reference-reader", auth_support.PASSWORD)
        self.auth.set_grant(reader["id"], self.admin["id"], "read")
        await self.switch_user("reference-reader")
        await self.reference_request(body, 403)
        self.auth.create_user("reference-stranger", auth_support.PASSWORD)
        await self.switch_user("reference-stranger")
        await self.reference_request(body, 404)
        self.client.session.cookie_jar.clear()
        await self.reference_request(body, 401)
        operator = self.auth.create_user("reference-operator", auth_support.PASSWORD)
        self.auth.set_grant(operator["id"], self.admin["id"], "operate")
        await self.switch_user("reference-operator")
        payload = await (await self.reference_request(body)).json()
        self.assertEqual(self.stage_card(payload["project"], "video")["created_by"], self.admin["id"])
        self.submit.assert_not_awaited()

    async def test_reference_permission_is_rechecked_before_atomic_write(self):
        project, _ = await self.prepare_reference()
        original = controller_app.require_project
        calls = 0

        async def revoked(request, pid, operate=False):
            nonlocal calls
            calls += 1
            if calls == 2:
                from aiohttp import web
                raise web.HTTPForbidden(text="权限已撤销")
            return await original(request, pid, operate=operate)

        with mock.patch.object(controller_app, "require_project", side_effect=revoked), \
                mock.patch.object(controller_app, "broadcast_collaboration") as broadcast:
            await self.reference_request(self.reference_body(project), 403)
        self.assertEqual(calls, 2)
        broadcast.assert_not_awaited()

    async def test_reference_manual_canvas_edge_and_asset_project_to_director_and_survive_save(self):
        project, _ = await self.prepare_reference()
        image, video = (self.stage_card(project, stage) for stage in ("image", "video"))
        asset = self.register_upload("manual-reference.png")
        video["assets"] = {"images[0]": asset,
                           "audios[0]": self.register_upload("manual-audio.wav", kind="audio")}
        project["edges"] = [
            {"from": image["id"], "to": video["id"], "slot": "images[0]",
             "slots": ["images[0]"], "version": {"job": "reference-old", "index": 0},
             "manual": {"retain": True}},
            {"from": video["id"], "to": image["id"], "slot": "@text", "custom": "keep"},
        ]
        restored = await self.canvas_save(project)
        expected_edges = copy.deepcopy(project["edges"])
        expected_assets = copy.deepcopy(video["assets"])
        self.assertEqual(restored["director"]["shots"][0]["video"]["assets"], expected_assets)
        self.assertEqual(restored["edges"], expected_edges)
        await self.reference_request(self.reference_body(restored), 409)
        saved = (await (await self.save(self.request_document(restored))).json())["project"]
        for source in (saved, self.read_project(), await self.get_project()):
            self.assertEqual(source["edges"], expected_edges)
            self.assertEqual(self.stage_card(source, "video")["assets"], expected_assets)
            self.assertEqual(source["director"]["shots"][0]["video"]["assets"], expected_assets)
        self.submit.assert_not_awaited()

    async def test_reference_storyboard_detaches_inputs_and_rejected_work(self):
        from aiohttp import web
        from server.director_bridge import reference_storyboard

        project, _ = await self.prepare_reference()
        body = self.reference_body(project)
        before = copy.deepcopy(project)
        version, asset = copy.deepcopy(body["version"]), copy.deepcopy(body["asset"])
        work = reference_storyboard(project, body["shot"], version, body["slot"], asset,
                                    self.caps, controller_app.JOBS)
        self.assertEqual(project, before)
        version["index"] = 999
        asset["ref"] = "must-not-alias"
        self.assertEqual(work["edges"][-1]["version"], body["version"])
        self.assertEqual(self.stage_card(work, "video")["assets"][body["slot"]], body["asset"])
        work["director"]["shots"][0]["video"]["assets"][body["slot"]]["ref"] = "projection-only"
        self.assertEqual(self.stage_card(work, "video")["assets"][body["slot"]], body["asset"])
        work["edges"][-1]["version"]["index"] = 123
        self.assertEqual(project, before)
        self.assertEqual(body["version"], {"job": "reference-old", "index": 0})
        with self.assertRaises(web.HTTPBadRequest):
            reference_storyboard(project, body["shot"], body["version"], "audios[0]",
                                 body["asset"], self.caps, controller_app.JOBS)
        self.assertEqual(project, before)

    async def test_unlinked_legacy_document_still_does_not_create_canvas_cards(self):
        before = self.seed_project(rev=7)
        await self.save(legacy.director([legacy.shot()]))
        after = self.read_project()
        for key in ("cards", "edges", "rev"):
            self.assertEqual(after[key], before[key])
        self.assertNotIn("card", after["director"]["shots"][0]["image"])

    async def test_linked_project_rejects_legacy_save_without_canvas_revision(self):
        project = await self.link()
        for body in (project["director"], legacy.director([legacy.shot()], rev=1)):
            with self.subTest(body=body):
                await self.assert_rejected(body, 409)

    async def test_unknown_unavailable_wrong_output_or_non_gen_capability_is_atomic_400(self):
        for stage, cap in (("image", "unknown"), ("image", "missing_graph"),
                           ("image", "minimax_h3_i2v"), ("video", "zimage_t2i"),
                           ("image", "image_tool")):
            with self.subTest(stage=stage, capability=cap):
                item = legacy.shot()
                item[stage]["capability"] = cap
                await self.assert_rejected(self.request_document(shots=[item]))

    async def test_invalid_canvas_revision_types_rejected_without_disk_write(self):
        for value in (None, True, False, -1, "0", 0.5, {}, []):
            with self.subTest(canvas_rev=value):
                body = self.request_document(shots=[legacy.shot()])
                body["canvas_rev"] = value
                before = self.project_path.read_bytes()
                response = await self.client.put(self.url, json=body)
                # 契约仅要求不能匹配 revision；schema 400 / conflict 409 均合法。
                self.assertIn(response.status, (400, 409), await response.text())
                self.assertEqual(self.project_path.read_bytes(), before)

    async def test_canvas_edits_hydrate_director_title_prompt_params_and_both_assets(self):
        item = legacy.shot()
        item["image"]["capability"] = "zimage_i2i"
        project = await self.link([item])
        self.register_asset("canvas-image.png")
        self.register_asset("canvas-video.png")
        image, video = (self.stage_card(project, stage) for stage in ("image", "video"))
        image.update(name="画布改标题", params={"prompt": "画布改描述", "seed": 77, "cfg": 2.5},
                     assets={"images[0]": legacy.reference("canvas-image.png")})
        video.update(params={"prompt": "画布改视频", "duration": 9},
                     assets={"images[0]": legacy.reference("canvas-video.png")})
        restored = await self.canvas_save(project)
        shot = restored["director"]["shots"][0]
        self.assertEqual(shot["title"], image["name"])
        self.assertEqual(shot["description"], image["params"]["prompt"])
        for stage, card in (("image", image), ("video", video)):
            self.assertEqual(shot[stage]["params"], card["params"])
            self.assertEqual(shot[stage]["assets"], card["assets"])
            self.assertEqual(shot[stage]["card"], card["id"])
        self.assertEqual(restored["director"]["rev"], 1)

    async def test_director_edits_save_params_title_description_assets_into_real_cards(self):
        item = legacy.shot()
        item["image"]["capability"] = "zimage_i2i"
        project = await self.link([item])
        self.register_asset("director-image.png")
        self.register_asset("director-video.png")
        body = self.request_document(project)
        shot = body["shots"][0]
        shot.update(title="导演改标题", description="导演改描述")
        shot["image"].update(params={"prompt": "导演改描述", "seed": 99, "cfg": 1.8},
                             assets={"images[0]": legacy.reference("director-image.png")})
        shot["video"].update(params={"prompt": "导演视频提示词", "duration": 8},
                             assets={"images[0]": legacy.reference("director-video.png")})
        response = await self.save(body)
        saved = (await response.json())["project"]
        restored = await self.get_project()
        for stage in ("image", "video"):
            for source in (saved, restored, self.read_project()):
                card = self.stage_card(source, stage)
                self.assertEqual(card["params"], shot[stage]["params"])
                self.assertEqual(card["assets"], shot[stage]["assets"])
                self.assertEqual(card["id"], self.stage_card(project, stage)["id"])
        self.assertEqual(self.stage_card(restored)["name"], shot["title"])

    async def test_sort_changes_only_shot_order_not_xy_groups_or_existing_edges(self):
        project = await self.link([legacy.shot("a"), legacy.shot("b")])
        for index, card in enumerate(project["cards"]):
            card.update(x=index * 333 - 900, y=index * 111 + 50)
        project["groups"] = [{"id": "g", "name": "自建组", "x": -1000, "y": 30,
                              "w": 2000, "h": 1000, "cards": [c["id"] for c in project["cards"]]}]
        project["edges"].append({"from": self.stage_card(project, "video", "a")["id"],
                                 "to": self.stage_card(project, "image", "b")["id"],
                                 "slot": "@text", "custom": "keep"})
        project = await self.canvas_save(project)
        before = self.read_project()
        body = self.request_document(project)
        body["shots"].reverse()
        response = await self.save(body)
        after = (await response.json())["project"]
        self.assertEqual([s["id"] for s in after["director"]["shots"]], ["b", "a"])
        self.assertEqual(after["groups"], before["groups"])
        self.assertEqual(after["edges"], before["edges"])
        self.assertEqual({c["id"]: (c["x"], c["y"]) for c in after["cards"]},
                         {c["id"]: (c["x"], c["y"]) for c in before["cards"]})

    async def test_remove_shot_keeps_cards_edges_and_clears_director_marker(self):
        project = await self.link([legacy.shot("a"), legacy.shot("b")])
        removed_ids = {self.stage_card(project, stage, "a")["id"] for stage in ("image", "video")}
        body = self.request_document(project)
        body["shots"] = [body["shots"][1]]
        response = await self.save(body)
        after = (await response.json())["project"]
        self.assertEqual(after["edges"], project["edges"])
        self.assertEqual(after["groups"], project["groups"])
        self.assertEqual(len(after["cards"]), 4)
        old_cards = {c["id"]: c for c in project["cards"]}
        for card in after["cards"]:
            if card["id"] in removed_ids:
                self.assertFalse(card.get("director_shot"))
                for key in ("cap", "type", "params", "assets", "outputs", "x", "y"):
                    self.assertEqual(card[key], old_cards[card["id"]][key])
            else:
                self.assertTrue(card.get("director_shot"))

    async def test_canvas_deleted_linked_card_causes_409_and_is_never_resurrected(self):
        project = await self.link()
        removed = self.stage_card(project)["id"]
        project["cards"] = [card for card in project["cards"] if card["id"] != removed]
        await self.canvas_save(project)
        body = self.request_document()
        await self.assert_rejected(body, 409)
        self.assertNotIn(removed, [card["id"] for card in self.read_project()["cards"]])

    async def test_new_canvas_cards_without_director_marker_never_join_shots(self):
        async def create_canvas_card(cid, stage):
            response = await self.client.post("/api/projects/p/cards", json={"card": {
                "id": cid, "type": "card_" + stage,
                "cap": "zimage_t2i" if stage == "image" else "minimax_h3_i2v",
                # 同名也不能成为自动关联的依据。
                "name": "开场", "x": 700, "y": 800,
                "params": {"prompt": "普通画布节点，不属于导演镜头"},
                "assets": {}, "outputs": [],
            }})
            self.assertEqual(response.status, 200, await response.text())
            card = (await response.json())["card"]
            self.assertFalse(card.get("director_shot"))
            self.assertFalse(card.get("director_stage"))
            return card

        early = await create_canvas_card("canvas-before-director", "image")
        untouched = await self.get_project()
        self.assertEqual(untouched.get("director", {}).get("shots", []), [])
        project = await self.link()
        expected_shots = copy.deepcopy(project["director"]["shots"])
        ordinary_ids = {early["id"]}
        for stage in ("image", "video"):
            card = await create_canvas_card("canvas-unlinked-" + stage, stage)
            ordinary_ids.add(card["id"])
            restored = await self.get_project()
            self.assertEqual(restored["director"]["shots"], expected_shots)

        # GET 投影、导演保存返回值和磁盘重载都必须只包含已手动关联的成员。
        response = await self.save(self.request_document(restored))
        saved = (await response.json())["project"]
        for source in (saved, self.read_project(), await self.get_project()):
            self.assertEqual(source["director"]["shots"], expected_shots)
            self.assertEqual(len(source["cards"]), 5)
            linked_ids = {shot[stage]["card"] for shot in source["director"]["shots"]
                          for stage in ("image", "video")}
            self.assertTrue(linked_ids.isdisjoint(ordinary_ids))
            for card in source["cards"]:
                if card["id"] in ordinary_ids:
                    self.assertFalse(card.get("director_shot"))
                    self.assertFalse(card.get("director_stage"))

    async def test_forged_same_project_unrelated_card_link_is_400(self):
        project = await self.link()
        response = await self.client.post("/api/projects/p/cards", json={"card": {
            "id": "unrelated", "type": "card_image", "cap": "zimage_t2i", "name": "无关卡",
            "x": 500, "y": 600, "params": {"prompt": "不能劫持"}, "assets": {}, "outputs": [],
        }})
        self.assertEqual(response.status, 200, await response.text())
        body = self.request_document(await self.get_project())
        body["shots"][0]["image"]["card"] = "unrelated"
        await self.assert_rejected(body)

    async def test_link_cannot_steal_another_shots_real_card(self):
        project = await self.link([legacy.shot("a"), legacy.shot("b")])
        body = self.request_document(project)
        body["shots"][0]["image"]["card"] = body["shots"][1]["image"]["card"]
        await self.assert_rejected(body)

    async def test_legacy_shot_migration_preserves_history_snapshots_and_adopted_outputs(self):
        item = legacy.shot()
        item["image"]["capability"] = "zimage_i2i"
        self.register_asset("legacy.png")
        item["assets"] = [legacy.reference("legacy.png")]
        for stage in ("image", "video"):
            jid = "legacy-" + stage
            output = self.snapshot_job(jid, stage)
            item["history"].append({"job": jid, "stage": stage, "outputs": [output]})
            item["selected"][stage] = {"job": jid, "index": 0}
        await self.save(legacy.director([item]))
        controller_app.JOBS.clear()
        response = await self.save(self.request_document())
        project = (await response.json())["project"]
        self.assertEqual(len(project["cards"]), 2)
        migrated = project["director"]["shots"][0]
        self.assertEqual(migrated["history"], item["history"])
        self.assertEqual(migrated["selected"], item["selected"])
        self.assertEqual(migrated["assets"], item["assets"])
        self.assertIn(legacy.reference("legacy.png"), self.stage_card(project)["assets"].values())
        for stage in ("image", "video"):
            card = self.stage_card(project, stage)
            history = next(h for h in card["history"] if h["job"] == "legacy-" + stage)
            expected = next(h for h in item["history"] if h["stage"] == stage)["outputs"]
            self.assertEqual(history["outputs"], expected)
            self.assertEqual(card["outputs"], expected)
            self.assertEqual(card["director_selected"], item["selected"][stage])
        restored = await self.get_project()
        self.assertEqual(restored["director"]["shots"][0]["selected"], item["selected"])
        self.assertEqual(restored["director"]["shots"][0]["history"], item["history"])

    async def test_saved_card_history_remains_previewable_after_jobs_cache_eviction(self):
        project = await self.link()
        card = self.stage_card(project)
        output = self.snapshot_job("persisted-history", card=card["id"])
        path = self.access.local_path("artifact", "persisted-history/result.png")
        path.parent.mkdir(parents=True)
        import base64
        content = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKf8AAAAASUVORK5CYII=")
        path.write_bytes(content)
        card.update(job="persisted-history", status="done", outputs=[output], history=[{
            "ts": 102000, "job": "persisted-history", "seed": 42, "cap": card["cap"],
            "ms": 1000, "outputs": [output],
        }])
        await self.canvas_save(project)
        controller_app.JOBS.clear()
        restored = await self.get_project()
        history = restored["director"]["shots"][0]["history"]
        self.assertIn({"job": "persisted-history", "stage": "image", "outputs": [output]}, history)
        self.assertEqual(self.stage_card(restored)["outputs"], [output])
        response = await self.client.get(output["url"])
        self.assertEqual(response.status, 200, await response.text() if response.status != 200 else "")
        self.assertEqual(await response.read(), content)
        await self.save(self.request_document(restored))

    async def test_trusted_done_job_projects_runtime_and_history_without_get_disk_write(self):
        project = await self.link()
        card = self.stage_card(project)
        output = self.snapshot_job("trusted-done", card=card["id"])
        card.update(job="trusted-done", status="queued", progress=0, outputs=[], history=[])
        await self.canvas_save(project)
        before = self.project_path.read_bytes()
        restored = await self.get_project()
        runtime = self.stage_card(restored)
        self.assertEqual(runtime["job"], "trusted-done")
        self.assertEqual(runtime["status"], "done")
        self.assertEqual(runtime["progress"], 1.0)
        self.assertEqual(runtime["outputs"], [output])
        self.assertEqual(runtime["step"], "完成")
        self.assertIsNone(runtime["error"])
        self.assertTrue(any(h.get("job") == "trusted-done" and h.get("outputs") == [output]
                            for h in runtime["history"]))
        self.assertIn({"job": "trusted-done", "stage": "image", "outputs": [output]},
                      restored["director"]["shots"][0]["history"])
        self.assertEqual(self.project_path.read_bytes(), before, "GET runtime 投影不得偷偷写盘/递增 rev")
        again = await self.get_project()
        self.assertEqual(self.stage_card(again)["history"], runtime["history"], "轮询不能重复插入历史")

    async def test_real_video_ladder_execution_syncs_queued_done_and_history(self):
        definitions = json.loads((ROOT / "manifests" / "_cards.json").read_text(encoding="utf-8"))
        video_modes = next(card["modes"] for card in definitions if card["id"] == "card_video")
        for entry in ("minimax_h3_flf2v", "minimax_h3_talk2"):
            mode = next(mode for mode in video_modes if mode["id"] == entry)
            execution = mode["ladder"]["1"]
            with self.subTest(entry=entry, execution=execution):
                sid = "ladder-" + entry
                item = legacy.shot(sid)
                item["image"]["capability"] = ""
                item["video"]["capability"] = entry
                project = await self.link([item])
                card = self.stage_card(project, "video", sid)
                self.register_asset(entry + ".png")
                response = await self.client.post("/api/generate", json={
                    "project": "p", "card": card["id"], "capability": execution,
                    "params": card["params"], "assets": {"images[0]": "chouka/" + entry + ".png"},
                })
                self.assertEqual(response.status, 200, await response.text())
                job = await response.json()
                queued = self.stage_card(self.read_project(), "video", sid)
                self.assertEqual(queued["cap"], entry)
                self.assertEqual(queued["job"], job["id"])
                self.assertEqual(queued["status"], "queued")
                self.assertEqual(job["capability"], execution)
                output = self.snapshot_job(job["id"], "video", card=card["id"])
                controller_app.JOBS[job["id"]]["capability"] = execution
                restored = await self.get_project()
                done = self.stage_card(restored, "video", sid)
                self.assertEqual(done["cap"], entry)
                self.assertEqual(done["status"], "done")
                self.assertEqual(done["progress"], 1)
                self.assertEqual(done["outputs"], [output])
                self.assertEqual(done["history"][0]["cap"], execution)
                expected = {"job": job["id"], "stage": "video", "outputs": [output]}
                self.assertIn(expected, restored["director"]["shots"][0]["history"])
                saved = (await (await self.save(self.request_document(restored))).json())["project"]
                self.assertEqual(self.stage_card(saved, "video", sid)["history"], done["history"])
                controller_app.JOBS.pop(job["id"])
                archived = await self.get_project()
                self.assertEqual(self.stage_card(archived, "video", sid)["outputs"], [output])
                self.assertIn(expected, archived["director"]["shots"][0]["history"])

    async def test_canvas_same_output_model_switch_after_submit_keeps_completion_and_history(self):
        project = await self.link()
        card = self.stage_card(project)
        output = self.snapshot_job("switch-pending", card=card["id"])
        job = controller_app.JOBS["switch-pending"]
        job.update(status="running", progress=0.4, outputs=[], ended=None)
        card.update(job="switch-pending", status="queued", progress=0, outputs=[], history=[])
        project = await self.canvas_save(project)
        self.assertEqual(self.stage_card(project)["status"], "running")
        self.stage_card(project)["cap"] = "zimage_i2i"
        project = await self.canvas_save(project)
        self.assertEqual(self.stage_card(project)["cap"], "zimage_i2i")
        self.assertEqual(self.stage_card(project)["progress"], 0.4)
        job.update(status="done", progress=1, outputs=[output], ended=102)
        restored = await self.get_project()
        done = self.stage_card(restored)
        self.assertEqual(done["status"], "done")
        self.assertEqual(done["outputs"], [output])
        self.assertEqual(done["history"][0]["cap"], "zimage_t2i")
        self.assertEqual(restored["director"]["shots"][0]["image"]["capability"], "zimage_i2i")
        saved = (await (await self.save(self.request_document(restored))).json())["project"]
        history = copy.deepcopy(self.stage_card(saved)["history"])
        self.stage_card(saved)["cap"] = "zimage_t2i"
        switched_again = await self.canvas_save(saved)
        self.assertEqual(self.stage_card(switched_again)["history"], history)
        controller_app.JOBS.clear()
        archived = await self.get_project()
        self.assertEqual(self.stage_card(archived)["history"], history)
        self.assertEqual(self.stage_card(archived)["outputs"], [output])
        await self.save(self.request_document(archived))
        self.assertEqual(self.stage_card(self.read_project())["history"], history)

    async def test_adopt_old_output_is_not_overwritten_by_polling_latest_done_job(self):
        project = await self.link()
        card = self.stage_card(project)
        old = self.snapshot_job("adopt-old", card=card["id"])
        latest = self.snapshot_job("latest-done", card=card["id"])
        card.update(job="latest-done", status="done", outputs=[latest], history=[
            {"job": "latest-done", "outputs": [latest], "cap": card["cap"], "ts": 2000},
            {"job": "adopt-old", "outputs": [old], "cap": card["cap"], "ts": 1000},
        ])
        project = await self.canvas_save(project)
        body = self.request_document(project)
        body["shots"][0]["selected"] = {"image": {"job": "adopt-old", "index": 0}}
        await self.save(body)
        for _ in range(2):
            restored = await self.get_project()
            self.assertEqual(self.stage_card(restored)["outputs"], [old])
            self.assertEqual(self.stage_card(restored)["director_selected"], {"job": "adopt-old", "index": 0})
            self.assertEqual(restored["director"]["shots"][0]["selected"]["image"],
                             {"job": "adopt-old", "index": 0})
            self.assertIn({"job": "latest-done", "stage": "image", "outputs": [latest]},
                          restored["director"]["shots"][0]["history"])
        self.assertEqual(self.stage_card(self.read_project())["outputs"], [old])

    async def test_adopt_cached_same_stage_output_from_prior_execution_mode(self):
        item = legacy.shot()
        item["image"]["capability"] = ""
        item["video"]["capability"] = "minimax_h3_talk2"
        project = await self.link([item])
        card = self.stage_card(project, "video")
        old = self.snapshot_job("old-ladder-run", "video", card=card["id"])
        latest = self.snapshot_job("latest-ladder-run", "video", card=card["id"])
        controller_app.JOBS["old-ladder-run"]["capability"] = "minimax_h3_i2v"
        controller_app.JOBS["latest-ladder-run"]["capability"] = "minimax_h3_talk1"
        card.update(job="latest-ladder-run", status="done", outputs=[latest], history=[
            {"job": "latest-ladder-run", "outputs": [latest], "cap": "minimax_h3_talk1"},
            {"job": "old-ladder-run", "outputs": [], "cap": "minimax_h3_i2v"},
        ])
        project = await self.canvas_save(project)
        body = self.request_document(project)
        body["shots"][0]["selected"] = {"video": {"job": "old-ladder-run", "index": 0}}
        saved = (await (await self.save(body)).json())["project"]
        adopted = self.stage_card(saved, "video")
        self.assertEqual(adopted["outputs"], [old])
        self.assertEqual(adopted["director_selected"], {"job": "old-ladder-run", "index": 0})
        previous = next(h for h in adopted["history"] if h["job"] == "old-ladder-run")
        self.assertEqual(previous["cap"], "minimax_h3_i2v")
        self.assertEqual(previous["outputs"], [old])
        self.assertEqual(self.stage_card(await self.get_project(), "video")["outputs"], [old])

    async def test_untrusted_job_identity_cannot_project_into_linked_card(self):
        project = await self.link()
        card = self.stage_card(project)
        card.update(job="untrusted", status="queued", progress=0, outputs=[], history=[])
        project = await self.canvas_save(project)
        baseline = {key: self.stage_card(project).get(key) for key in ("status", "progress", "outputs", "history")}
        valid = {"id": "untrusted", "project": "p", "card": card["id"], "capability": card["cap"],
                 "status": "done", "progress": 1, "outputs": [{"kind": "image", "url": "/fake"}]}
        for field, value in (("project", "other"), ("card", "other-card"),
                             ("capability", "minimax_h3_i2v"),
                             ("capability", "image_tool"), ("capability", "unknown")):
            with self.subTest(identity=field):
                controller_app.JOBS["untrusted"] = {**valid, field: value}
                restored = await self.get_project()
                runtime = self.stage_card(restored)
                self.assertEqual({key: runtime.get(key) for key in baseline}, baseline)
                self.assertFalse(any(h.get("outputs") for h in restored["director"]["shots"][0]["history"]))

    async def test_history_merge_and_cached_adoption_share_stage_based_trust(self):
        from aiohttp import web
        from server.director_bridge import _adopt, _merge_history

        card = {"id": "same-card", "cap": "minimax_h3_flf2v", "director_shot": "same-shot",
                "director_stage": "video", "job": "cached", "history": [], "outputs": []}
        output = {"kind": "video", "url": "/trusted-output"}
        job = {"project": "p", "card": card["id"], "capability": "minimax_h3_i2v",
               "status": "done", "outputs": [output]}
        shot = {"history": []}
        _merge_history(shot, {"video": card}, {"cached": job}, self.caps, "p")
        self.assertEqual(shot["history"], [{"job": "cached", "stage": "video", "outputs": [output]}])
        choice = {"job": "cached", "index": 0}
        adopted = copy.deepcopy(card)
        _adopt(adopted, choice, {"cached": job}, self.caps, "p")
        self.assertEqual(adopted["outputs"], [output])
        self.assertEqual(adopted["history"][0]["cap"], "minimax_h3_i2v")
        for field, value in (("project", "other"), ("card", "other-card"),
                             ("capability", "zimage_t2i"), ("capability", "image_tool"),
                             ("capability", "unknown")):
            with self.subTest(identity=field, value=value):
                untrusted = {**job, field: value}
                shot = {"history": []}
                _merge_history(shot, {"video": card}, {"cached": untrusted}, self.caps, "p")
                self.assertEqual(shot["history"], [{"job": "cached", "stage": "video"}])
                adopted = copy.deepcopy(card)
                with self.assertRaises(web.HTTPBadRequest):
                    _adopt(adopted, choice, {"cached": untrusted}, self.caps, "p")
                self.assertEqual(adopted, card)

    async def test_generate_snapshots_previous_trusted_done_job_before_replacing_job_id(self):
        project = await self.link()
        card = self.stage_card(project)
        output = self.snapshot_job("previous-completion", card=card["id"])
        card.update(job="previous-completion", status="queued", history=[], outputs=[])
        self.seed_project(cards=project["cards"])
        response = await self.client.post("/api/generate", json={
            "project": "p", "card": card["id"], "capability": card["cap"],
            "params": card["params"], "assets": {},
        })
        self.assertEqual(response.status, 200, await response.text())
        queued = self.stage_card(self.read_project())
        self.assertEqual(queued["status"], "queued")
        self.assertEqual(queued["job"], (await response.json())["id"])
        self.assertTrue(any(item["job"] == "previous-completion" and item["outputs"] == [output]
                            for item in queued["history"]))
        controller_app.JOBS.pop("previous-completion")
        restored = await self.get_project()
        self.assertIn({"job": "previous-completion", "stage": "image", "outputs": [output]},
                      restored["director"]["shots"][0]["history"])

    async def test_generate_persists_queued_job_clears_adoption_and_returns_project_rev(self):
        project = await self.link()
        card = self.stage_card(project)
        output = self.snapshot_job("before-generate", card=card["id"])
        card.update(outputs=[output], history=[{"job": "before-generate", "outputs": [output]}],
                    director_selected={"job": "before-generate", "index": 0})
        project = await self.canvas_save(project)
        old_revision = project["rev"]
        messages = []
        actual_broadcast = controller_app.broadcast_collaboration

        async def observe_broadcast(*args, **kwargs):
            messages.append(copy.deepcopy(args[2]))
            return await actual_broadcast(*args, **kwargs)

        with mock.patch.object(controller_app, "broadcast_collaboration", side_effect=observe_broadcast):
            response = await self.client.post("/api/generate", json={
                "project": "p", "card": card["id"], "cardName": card["name"],
                "capability": card["cap"], "params": card["params"], "assets": {},
            })
        self.assertEqual(response.status, 200, await response.text())
        job = await response.json()
        self.submit.assert_awaited_once()
        self.assertEqual(job["status"], "queued")
        self.assertEqual(job["project_rev"], old_revision + 1)
        disk = self.read_project()
        queued = self.stage_card(disk)
        self.assertEqual(disk["rev"], job["project_rev"])
        self.assertEqual(queued["job"], job["id"])
        self.assertEqual(queued["status"], "queued")
        self.assertFalse(queued.get("director_selected"))
        self.assertTrue(any(message.get("project", {}).get("rev") == job["project_rev"]
                            or message.get("rev") == job["project_rev"] for message in messages),
                        "关联卡任务提交必须广播新画布 revision")
        stale = self.request_document(project)
        await self.assert_rejected(stale, 409)
        fresh = self.request_document(await self.get_project())
        await self.save(fresh)

    async def test_concurrent_canvas_and_linked_director_save_do_not_lose_cards(self):
        body = self.request_document(shots=[legacy.shot()])
        responses = await self.run_queued_writes([
            lambda: self.client.put(self.url, json=body),
            lambda: self.client.put("/api/projects/p", json={"rev": 0, "cards": [], "edges": []}),
        ])
        self.assertEqual(sorted(response.status for response in responses), [200, 409])
        project = self.read_project()
        self.assertEqual(project["rev"], 1)
        if responses[0].status == 200:
            self.assertEqual(len(project["cards"]), 2)
            self.assertEqual(project["edges"], [])
            self.assertEqual(project["director"]["rev"], 1)
        else:
            self.assertEqual(project["cards"], [])
            self.assertNotIn("director", project)

    async def test_operator_is_recorded_as_new_card_author_not_project_owner(self):
        operator = self.auth.create_user("operator", auth_support.PASSWORD)
        self.auth.set_grant(operator["id"], self.admin["id"], "operate")
        await self.switch_user("operator")
        project = await self.link()
        for card in project["cards"]:
            self.assertEqual(card["created_by"], operator["id"])
            self.assertEqual(card["created_by_name"], "operator")
        await self.switch_user("admin")
        response = await self.save(self.request_document(project))
        for card in (await response.json())["project"]["cards"]:
            self.assertEqual(card["created_by"], operator["id"], "后续保存不能夺走原作者归属")

    async def test_locked_project_link_save_is_403_without_creating_cards(self):
        self.seed_project(locked=True)
        await self.assert_rejected(self.request_document(shots=[legacy.shot()]), 403)
        self.submit.assert_not_awaited()

    async def test_readonly_can_read_hydrated_director_but_cannot_link_save_or_generate(self):
        project = await self.link()
        user = self.auth.create_user("bridge-reader", auth_support.PASSWORD)
        self.auth.set_grant(user["id"], self.admin["id"], "read")
        await self.switch_user("bridge-reader")
        restored = await self.get_project()
        self.assertEqual(restored["permission"], "read")
        self.assertEqual(restored["director"], project["director"])
        await self.assert_rejected(self.request_document(restored), 403)
        before = self.project_path.read_bytes()
        response = await self.client.post("/api/generate", json={
            "project": "p", "card": self.stage_card(project)["id"],
            "capability": "zimage_t2i", "params": {}, "assets": {},
        })
        self.assertEqual(response.status, 403, await response.text())
        self.assertEqual(self.project_path.read_bytes(), before)
        self.submit.assert_not_awaited()

    async def test_foreign_project_is_404_on_read_and_link_save(self):
        self.auth.create_user("bridge-stranger", auth_support.PASSWORD)
        await self.switch_user("bridge-stranger")
        self.assertEqual((await self.client.get("/api/projects/p")).status, 404)
        await self.assert_rejected(self.request_document(shots=[legacy.shot()]), 404)

    async def test_foreign_or_unregistered_stage_assets_rejected_without_partial_link(self):
        owner = self.auth.create_user("foreign-assets", auth_support.PASSWORD)
        self.own_project("other", owner=owner)
        self.register_asset("foreign.png", "other")
        for stage in ("image", "video"):
            for name in ("foreign.png", "missing.png"):
                with self.subTest(stage=stage, asset=name):
                    item = legacy.shot()
                    item["image"]["capability"] = "zimage_i2i"
                    item[stage]["assets"] = {"images[0]": legacy.reference(name)}
                    await self.assert_rejected(self.request_document(shots=[item]), 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "upload", "foreign.png", "p"))
        self.assertTrue(self.access.authorize(owner["id"], "upload", "foreign.png", "other"))

    async def test_foreign_job_snapshot_cannot_be_migrated_or_adopted(self):
        self.own_project("other")
        output = self.snapshot_job("foreign-job", pid="other")
        item = legacy.shot()
        item["history"] = [{"job": "foreign-job", "stage": "image", "outputs": [output]}]
        item["selected"] = {"image": {"job": "foreign-job", "index": 0}}
        # 与旧 API 一样，外项目资源以 404 拒绝，管理员也不能把引用重新绑定到 p。
        await self.assert_rejected(self.request_document(shots=[item]), 404)
        self.assertFalse(self.access.authorize(self.admin["id"], "artifact", "foreign-job/result.png", "p"))

    async def test_malformed_stage_assets_card_ids_and_external_references_are_400(self):
        for stage in ("image", "video"):
            cases = [("assets", []), ("assets", "not a slot dictionary"),
                     ("assets", {"images[0]": {"ref": "https://foreign.invalid/x.png",
                                             "url": "https://foreign.invalid/x.png",
                                             "kind": "image", "origin": "upload"}}),
                     ("card", 1), ("card", []), ("card", "../bad")]
            for key, value in cases:
                with self.subTest(stage=stage, key=key, value=value):
                    item = legacy.shot()
                    item["image"]["capability"] = "zimage_i2i"
                    item[stage][key] = value
                    await self.assert_rejected(self.request_document(shots=[item]))


if __name__ == "__main__":
    unittest.main()
