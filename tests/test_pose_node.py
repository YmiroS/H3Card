"""姿势估计交节点跑的收线口径（Spec M3）：能力怎么选、产物怎么认、失败了说什么。

派发四件套整组换成假件，这里不测 rtmlib 本身（那在节点包），测的是服务端这一侧：
一张图 → 一条 pose_* 工作流 → 一份关键点 JSON，字段名要和浏览器 detectPose 一致，
下游（3D 打光台的骨架拟合）才不用跟着改。
"""
import json
import os
from pathlib import Path
import sys
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
from test_cloud_lighting import CloudLightingFixture, StubComfySession, app  # noqa: E402

POSE = {"landmarks": [[{"x": 0.1, "y": 0.2, "z": 0.0, "visibility": 0.9, "presence": 0.9}] * 33],
        "worldLandmarks": [[{"x": 0.0, "y": 0.0, "z": 0.0, "visibility": 0.9, "presence": 0.9}] * 33],
        "diagnostics": {"model": "rtmw", "count": 1, "backend": "local_onnxruntime"}}


class PoseNodeTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """单机自环：服务端提交给一台 ComfyUI，取回 ckpose*_.json 那一份产物。"""

    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.backend_calls = {"upload": [], "patch": [], "submit": [], "collect": 0}
        self.files = [{"kind": "file", "filename": "ckpose_00001_json.json",
                       "subfolder": "chouka", "type": "output"},
                      {"kind": "file", "filename": "ckposeprev_00001_.png",
                       "subfolder": "chouka", "type": "output"}]
        self.history_entry = {"status": {"status_str": "success", "completed": True,
                                         "messages": []}}
        self.blobs = {}
        node = self.application["comfy_node"]
        self.real_node = dict(node)
        node["http"] = "http://fake-comfy"
        node["session"] = StubComfySession(self)
        node["upload"] = self.stub_upload
        node["patch"] = self.stub_patch
        node["submit"] = self.stub_submit
        node["collect"] = self.stub_collect

    async def asyncTearDown(self):
        node = self.application["comfy_node"]
        for key, value in self.real_node.items():
            node[key] = value
        await super().asyncTearDown()

    def set_pose_payload(self, payload=POSE, name="ckpose_00001_json.json"):
        self.blobs[name] = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    async def stub_upload(self, session, field_name, filename, data):
        self.backend_calls["upload"].append(filename)
        return f"chouka/{filename}"

    def stub_patch(self, cap, params, uploaded):
        self.backend_calls["patch"].append((cap["id"], dict(params), dict(uploaded)))
        return {"1": {"class_type": "LoadImage", "inputs": {"image": uploaded["images[0]"]}}}

    async def stub_submit(self, app_, graph, prompt_id=None, *, capability=None):
        self.backend_calls["submit"].append((prompt_id, capability))
        return "0f1e2d3c-4b5a-4978-8675-4321fedcba09"

    async def stub_collect(self, session, pid, *, wait_history=False):
        self.backend_calls["collect"] += 1
        return self.files

    async def estimate(self, **body):
        payload = {"project": self.project, "image": self.upstream["ref"], **body}
        return await self.client.post("/api/pose/estimate", headers=self.headers, json=payload)

    async def test_rtmw_payload_comes_back_with_the_browser_shape(self):
        self.set_pose_payload()
        response = await self.estimate(engine="rtmw")
        text = await response.text()
        self.assertEqual(response.status, 200, text)
        payload = json.loads(text)
        self.assertEqual(payload["engine"], "node_rtmw")
        self.assertEqual(payload["landmarks"], POSE["landmarks"])
        self.assertEqual(payload["worldLandmarks"], POSE["worldLandmarks"])
        self.assertEqual(payload["diagnostics"]["backend"], "local_onnxruntime")
        # 节点自己没写 engine 时服务端补一个，页面才知道这份结果从哪来
        self.assertEqual(payload["diagnostics"]["engine"], "node_rtmw")
        self.assertTrue(self.backend_calls["upload"][0].startswith("ck_"))
        cap, params, uploaded = self.backend_calls["patch"][0]
        self.assertEqual(cap, "pose_rtmw")
        self.assertEqual(params["pose_model"], "rtmw-dw-x-l_simcc-cocktail14_384x288.onnx")
        self.assertEqual(params["model_mode"], "performance")
        self.assertTrue(uploaded["images[0]"].startswith("chouka/ck_"))
        self.assertEqual(self.backend_calls["submit"][0][1], "pose_rtmw")
        self.assertIsNone(self.backend_calls["submit"][0][0])

    async def test_rtmw3d_uses_its_own_capability_and_prefix(self):
        self.files = [{"kind": "file", "filename": "ckpose3d_00001_json.json",
                       "subfolder": "chouka", "type": "output"}]
        self.set_pose_payload({**POSE, "diagnostics": {**POSE["diagnostics"], "model": "rtmw3d"}},
                              "ckpose3d_00001_json.json")
        response = await self.estimate(engine="rtmw3d")
        text = await response.text()
        self.assertEqual(response.status, 200, text)
        self.assertEqual(json.loads(text)["engine"], "node_rtmw3d")
        cap, params, _uploaded = self.backend_calls["patch"][0]
        self.assertEqual(cap, "pose_rtmw3d")
        self.assertEqual(params["pose_model"], "rtmw3d-x_8xb64_cocktail14-384x288.onnx")
        self.assertEqual(params["model_mode"], "balanced")

    async def test_zero_people_is_returned_as_is(self):
        """节点检出 0 人也要原样回，服务端不许把它翻成错误：页面要能区分「没人」和「没跑成」。"""
        empty = {"landmarks": [], "worldLandmarks": [],
                 "diagnostics": {"model": "rtmw", "count": 0, "note": "没检出人体框"}}
        self.set_pose_payload(empty)
        response = await self.estimate(engine="rtmw")
        payload = json.loads(await response.text())
        self.assertEqual(response.status, 200, payload)
        self.assertEqual(payload["landmarks"], [])
        self.assertEqual(payload["diagnostics"]["note"], "没检出人体框")

    async def test_unknown_engine_is_refused(self):
        response = await self.estimate(engine="mediapipe")
        self.assertEqual(response.status, 400)
        self.assertIn("姿势引擎只支持", await response.text())

    async def test_missing_image_is_refused(self):
        response = await self.client.post("/api/pose/estimate", headers=self.headers,
                                          json={"project": self.project, "engine": "rtmw"})
        self.assertEqual(response.status, 400)
        self.assertIn("已登记的图片", await response.text())

    async def test_missing_artifact_is_not_silent(self):
        self.files = [{"kind": "file", "filename": "ckposeprev_00001_.png",
                       "subfolder": "chouka", "type": "output"}]
        response = await self.estimate(engine="rtmw")
        self.assertEqual(response.status, 502)
        self.assertIn("没出齐产物", await response.text())

    async def test_payload_without_landmarks_is_refused(self):
        self.set_pose_payload({"diagnostics": {"count": 1}})
        response = await self.estimate(engine="rtmw")
        self.assertEqual(response.status, 502)
        self.assertIn("landmarks", await response.text())

    async def test_channel_not_mounted_says_so(self):
        """自建 app 的测试没挂通道字典时要 501 说清楚，而不是 KeyError 崩在半路。"""
        missing = self.application.pop("comfy_node")
        try:
            response = await self.estimate(engine="rtmw")
        finally:
            self.application["comfy_node"] = missing
        self.assertEqual(response.status, 501)
        self.assertIn("节点执行通道", await response.text())

    async def test_capability_not_registered_says_so(self):
        self.application["caps"].pop("pose_rtmw", None)
        response = await self.estimate(engine="rtmw")
        self.assertEqual(response.status, 501)
        self.assertIn("pose_rtmw", await response.text())


class PoseNodePreflightTests(CloudLightingFixture, unittest.IsolatedAsyncioTestCase):
    """集群模式提交期预检（M3-7）：没有合格执行端要当场说清楚，不静默排队、也不改口去花钱。"""

    controller_mode = True

    POSE_CLASSES = {"LoadImage", "ChoukaRtmwPose", "ChoukaSaveJson", "SaveImage"}

    def capabilities(self, *, classes, weights=True):
        payload = {"hardware": {"os": {"name": "Windows"}},
                   "node_classes": sorted(classes),
                   "devices": [{"name": "RTX 4090", "type": "cuda",
                                "memory_total": 24 * 1024 ** 3}],
                   "input_choices": {}, "input_types": {}}
        if weights is True:
            payload["input_choices"] = {
                "ChoukaRtmwPose": {
                    "det_model": ["yolox_m_8xb8-300e_humanart.onnx"],
                    "pose_model": ["rtmw-dw-x-l_simcc-cocktail14_384x288.onnx"]},
                "ChoukaRtmw3dPose": {
                    "det_model": ["yolox_m_8xb8-300e_humanart.onnx"],
                    "pose_model": ["rtmw3d-x_8xb64_cocktail14-384x288.onnx"]},
            }
        elif weights == "wrong":
            # 枚举得到别家的 onnx、就是没有工作流里写死那两份：这才是「权重不在位」
            payload["input_choices"] = {
                "ChoukaRtmwPose": {"det_model": ["someone_else.onnx"],
                                   "pose_model": ["someone_else_pose.onnx"]},
                "ChoukaRtmw3dPose": {"det_model": ["someone_else.onnx"],
                                     "pose_model": ["someone_else_3d.onnx"]},
            }
        return payload

    def register(self, capabilities):
        distributed = self.application["distributed"]
        worker_id = distributed.register_worker("pose-node-1", capabilities)["worker_id"]
        distributed.heartbeat(worker_id, capabilities=capabilities, comfy_online=True)
        return distributed

    async def estimate(self, **body):
        return await self.client.post("/api/pose/estimate", headers=self.headers,
                                      json={"project": self.project,
                                            "image": self.upstream["ref"], **body})

    async def test_missing_pose_node_is_refused_at_submit_time(self):
        self.register(self.capabilities(classes={"LoadImage", "SaveImage"}))
        response = await self.estimate(engine="rtmw")
        text = await response.text()
        self.assertEqual(response.status, 501, text)
        self.assertIn("缺少此能力所需节点", text)

    async def test_missing_weight_inventory_is_refused(self):
        """节点类在位但 rtmlib 那三份 onnx 枚举不到：派上去运行期才炸，预检这关就该拦。"""
        self.register(self.capabilities(classes=self.POSE_CLASSES, weights="wrong"))
        response = await self.estimate(engine="rtmw")
        text = await response.text()
        self.assertEqual(response.status, 501, text)
        self.assertIn("没有合格的执行端", text)

    async def test_rtmw3d_needs_its_own_weight(self):
        """2D 档的权重清单不能顶替 3D 档：只报了 RTMW 那份 onnx 的节点跑不了 pose_rtmw3d。"""
        payload = self.capabilities(classes=self.POSE_CLASSES | {"ChoukaRtmw3dPose"})
        payload["input_choices"]["ChoukaRtmw3dPose"]["pose_model"] = [
            "rtmw-dw-x-l_simcc-cocktail14_384x288.onnx"]
        self.register(payload)
        response = await self.estimate(engine="rtmw3d")
        self.assertEqual(response.status, 501, await response.text())


if __name__ == "__main__":
    unittest.main()
