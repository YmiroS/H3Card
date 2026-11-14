"""3D 打光台的姿势估计交节点跑（Spec M3）。

口径沿用外部 Lumen-4 那份本机姿势服务（`local-pose-service/rtmw_service.py`）：
COCO-WholeBody 133 → MediaPipe 33、肩中点到髋中点当 0.5m 定尺度、每人上限 6 人。
返回的三段字段名与浏览器 `detectPose()` 完全一致，前端换实现时下游一行不用改（M4）。

这里**只做节点派发**，服务机自己不跑推理：rtmlib + onnxruntime 那套重依赖本来就不该装到
服务机上（D5：服务端后面迁云端）。缺执行端或缺权重都在提交期说清原因，不静默排队、
也不会自动升级成计费请求。
"""
import asyncio
import json

from aiohttp import web

from . import local_relight
from .cloud_lighting import node_run_graph, perception_block

ENGINES = {
    "rtmw": {"capability": "pose_rtmw", "prefix": "ckpose_",
             "params": {"model_mode": "performance",
                        "det_model": "yolox_m_8xb8-300e_humanart.onnx",
                        "pose_model": "rtmw-dw-x-l_simcc-cocktail14_384x288.onnx"}},
    "rtmw3d": {"capability": "pose_rtmw3d", "prefix": "ckpose3d_",
               "params": {"model_mode": "balanced",
                          "det_model": "yolox_m_8xb8-300e_humanart.onnx",
                          "pose_model": "rtmw3d-x_8xb64_cocktail14-384x288.onnx"}},
}


class PoseNode:
    def __init__(self, app, *, root, lighting):
        """lighting 复用 CloudLighting 的图片取回与图读取，派发走 cloud_lighting 那套公共通道。"""
        self.app = app
        self.root = root
        self.lighting = lighting

    def _plan(self, body):
        project_id, image, engine = body.get("project"), body.get("image"), body.get("engine")
        if not isinstance(image, str) or not image.strip():
            raise web.HTTPBadRequest(text="姿势估计需要一张画布内已登记的图片")
        if engine not in ENGINES:
            raise web.HTTPBadRequest(text="姿势引擎只支持 rtmw（2D）或 rtmw3d（带相对深度）")
        return project_id, image, engine

    async def _block(self, capability):
        """派发前置：服务机纯计算依赖 + 集群里有没有能跑这张图的执行端。

        名册查询走 `to_thread`：`perception_block` 要读 SQLite，识别那条也是这么包的，
        别让预检把事件循环卡住（一次预检就是几个 worker 的 capability JSON）。
        """
        if not local_relight.in_process_ready():
            raise web.HTTPNotImplemented(
                text="姿势估计还没接入：服务端缺少纯计算依赖（OpenCV/NumPy）")
        graph = self.lighting.capability_graph(capability)
        if self.app.get("distributed") is None:
            return  # 单机自环：连不上 ComfyUI 由提交期那条错误说清楚
        reason = await asyncio.to_thread(perception_block, self.app, graph, capability=capability)
        if reason:
            raise web.HTTPNotImplemented(text=f"姿势估计没有可用的执行端：{reason}")

    async def estimate(self, request, body):
        """一张图 → 所有人的 33 点关键点（landmarks / worldLandmarks / diagnostics）。"""
        project_id, image, engine = self._plan(body)
        spec = ENGINES[engine]
        await self._block(spec["capability"])
        data, _ref, _info = await self.lighting.source(request, project_id, image)
        np = local_relight._imports()[1]
        # 先按 EXIF 转正再重编码：节点回传的坐标是归一化的，但骨架预览和后续拟合
        # 都按这张重编码后的图算，转正口径必须与识别那条一致。
        payload = local_relight.encode_png(np.asarray(local_relight.load_rgb(data)))
        got = await node_run_graph(self.app, spec["capability"], payload, dict(spec["params"]),
                                   {"pose": (spec["prefix"], ".json")}, label="姿势")
        result = json.loads(got["pose"].decode("utf-8"))
        for key in ("landmarks", "worldLandmarks"):
            if not isinstance(result.get(key), list):
                raise web.HTTPBadGateway(
                    text=f"节点回传的姿势 JSON 缺少 {key} 列表，请检查工作流 "
                         f"graphs/{spec['capability']}.api.json")
        diagnostics = result.get("diagnostics") or {}
        diagnostics.setdefault("engine", f"node_{engine}")
        return web.json_response({"landmarks": result["landmarks"],
                                  "worldLandmarks": result["worldLandmarks"],
                                  "diagnostics": diagnostics,
                                  "engine": f"node_{engine}"})
