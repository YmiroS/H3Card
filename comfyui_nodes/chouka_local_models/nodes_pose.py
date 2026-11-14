"""姿势估计节点：RTMW 全身 2D / RTMW3D，输出与浏览器端 MediaPipe 同形状的 JSON。

映射表与换算口径直接沿用外部 Lumen-4 本机姿势服务（local-pose-service/rtmw_service.py）里
已经跑通的那一份：COCO-WholeBody 133 → MediaPipe 33、以「肩中点到髋中点 = 0.5m」定尺度、
每人上限 6 人。改成节点只是为了把执行位置搬到有依赖的机器上，不能顺手改口径——
下游 3D 打光台的骨架拟合、落地校正都按这套数字调过，换口径等于把所有样张重测一遍。
"""
import json

import numpy as np

from . import chouka_models as models

# COCO-WholeBody 133 → MediaPipe 兼容 33；重复的眼部点是刻意别名，嘴部细节没有对应项就留 None。
MAP = [0, 1, 1, 1, 2, 2, 2, 3, 4, None, None, 5, 6, 7, 8, 9, 10,
       111, 132, 99, 120, 95, 116, 11, 12, 13, 14, 15, 16, 19, 22, 17, 20]
MAX_PEOPLE = 6
MIN_CORE_SCORE = 0.25
TORSO_METERS = 0.5


def _image_to_bgr(image):
    from . import chouka_rules as rules

    array = (np.clip(image[0].cpu().numpy(), 0, 1) * 255.0).astype(np.uint8)
    return rules.to_bgr(array)


def convert(kpts, scores, width, height, depth=None):
    """逐人 → (landmarks 归一化, worldLandmarks 米制)；核心点置信不够的人直接丢掉。"""
    people, world = [], []
    for person_i, (xy, sc) in enumerate(zip(kpts, scores)):
        if float(np.mean(sc[[5, 6, 11, 12]])) < MIN_CORE_SCORE:
            continue
        hip = (xy[11] + xy[12]) / 2
        torso_px = float(np.linalg.norm((xy[5] + xy[6]) / 2 - hip))
        # X/Y 尺度是写死的艺术假设，不是测出来的深度；口径必须和姿势服务一致。
        px_per_m = max(torso_px / TORSO_METERS, 20.0)
        z = depth[person_i, :, 2] if depth is not None else np.zeros(len(xy))
        hip_z = (z[11] + z[12]) / 2
        pts, wp = [], []
        for index in MAP:
            idx = index if index is not None else 0
            confidence = float(sc[idx]) if index is not None else 0.0
            confidence = max(0.0, min(1.0, confidence))
            pts.append({"x": float(xy[idx, 0] / width), "y": float(xy[idx, 1] / height),
                        "z": float(z[idx] - hip_z), "visibility": confidence,
                        "presence": confidence})
            wp.append({"x": float((xy[idx, 0] - hip[0]) / px_per_m),
                       "y": float((xy[idx, 1] - hip[1]) / px_per_m),
                       "z": float(z[idx] - hip_z), "visibility": confidence,
                       "presence": confidence})
        people.append(pts)
        world.append(wp)
    return people[:MAX_PEOPLE], world[:MAX_PEOPLE]


class ChoukaRtmwPose:
    """RTMW 全身姿势（2D）：出 landmarks / worldLandmarks / diagnostics 三段，格式同 detectPose。"""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "model_mode": (["performance", "balanced", "lightweight"],),
                "det_model": (models.combo(models.POSE_CATEGORY, models.DET_MODEL_DEFAULT,
                                           suffixes=(".onnx",)),),
                "pose_model": (models.combo(models.POSE_CATEGORY,
                                             models.RTMW_MODEL_DEFAULT, suffixes=(".onnx",)),),
            }
        }

    RETURN_TYPES = ("STRING", "INT", "IMAGE")
    RETURN_NAMES = ("pose_json", "count", "preview")
    FUNCTION = "estimate"
    CATEGORY = "chouka/姿势"
    DESCRIPTION = "RTMW 全身姿势估计（CPU onnxruntime），结果以 JSON 文本交给下游落盘。"

    def estimate(self, image, model_mode, det_model, pose_model):
        from rtmlib import Wholebody

        model = models.pose_model(Wholebody, model_mode, det_model, pose_model)
        img = _image_to_bgr(image)
        height, width = img.shape[:2]
        boxes = model.det_model(img)
        if len(boxes) == 0:
            payload = {"landmarks": [], "worldLandmarks": [],
                       "diagnostics": {"model": "rtmw", "count": 0, "note": "没检出人体框"}}
            return (json.dumps(payload, ensure_ascii=False), 0, image)
        xy, scores = model.pose_model(img, bboxes=boxes)
        landmarks, world = convert(xy, scores, width, height)
        diagnostics = {"model": "rtmw", "count": len(landmarks), "backend": "local_onnxruntime",
                       "depth_source": "unmeasured_planar", "scale_measured": False,
                       "xy_scale_assumption": f"shoulder_to_hip_{TORSO_METERS}m",
                       "coordinate_convention": "image x right, y down, relative z model "
                                                "prediction; not calibrated world positions"}
        payload = {"landmarks": landmarks, "worldLandmarks": world, "diagnostics": diagnostics}
        return (json.dumps(payload, ensure_ascii=False), len(landmarks), _skeleton_preview(image,
                                                                                           landmarks))


class ChoukaRtmw3dPose(ChoukaRtmwPose):
    """RTMW3D：模型自己预测相对深度（z 有值），但没有标定，仍是「相对量」不是世界坐标。"""

    @classmethod
    def INPUT_TYPES(cls):
        base = super().INPUT_TYPES()
        required = dict(base["required"])
        required["model_mode"] = (["balanced"],)
        required["pose_model"] = (models.combo(models.POSE_CATEGORY, models.RTMW3D_MODEL_DEFAULT,
                                               suffixes=(".onnx",)),)
        return {"required": required, "optional": base.get("optional", {})}

    CATEGORY = "chouka/姿势"
    DESCRIPTION = "RTMW3D 全身姿势 + 模型预测的相对深度，输出格式与 2D 档一致。"

    def estimate(self, image, model_mode, det_model, pose_model):
        from rtmlib import Wholebody3d

        model = models.pose_model(Wholebody3d, model_mode, det_model, pose_model)
        img = _image_to_bgr(image)
        height, width = img.shape[:2]
        boxes = model.det_model(img)
        if len(boxes) == 0:
            payload = {"landmarks": [], "worldLandmarks": [],
                       "diagnostics": {"model": "rtmw3d", "count": 0, "note": "没检出人体框"}}
            return (json.dumps(payload, ensure_ascii=False), 0, image)
        xyz, scores, _simcc, xy = model.pose_model(img, bboxes=boxes)
        landmarks, world = convert(xy, scores, width, height, xyz)
        diagnostics = {"model": "rtmw3d", "count": len(landmarks), "backend": "local_onnxruntime",
                       "depth_source": "rtmw3d_relative_prediction", "scale_measured": False,
                       "xy_scale_assumption": f"shoulder_to_hip_{TORSO_METERS}m",
                       "coordinate_convention": "image x right, y down, relative z model "
                                                "prediction; not calibrated world positions"}
        payload = {"landmarks": landmarks, "worldLandmarks": world, "diagnostics": diagnostics}
        return (json.dumps(payload, ensure_ascii=False), len(landmarks),
                _skeleton_preview(image, landmarks))


def _skeleton_preview(image, landmarks):
    """把每人 33 点画回原图：验收时一眼能看出点位有没有对到人。"""
    import torch

    base = np.clip(image[0].cpu().numpy(), 0, 1).copy()
    height, width = base.shape[0], base.shape[1]
    pairs = [(11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24),
             (23, 24), (23, 25), (25, 27), (24, 26), (26, 28), (0, 11), (0, 12)]
    for person in landmarks:
        points = [(p["x"] * width, p["y"] * height) for p in person]
        for left, right in pairs:
            if person[left]["visibility"] < 0.3 or person[right]["visibility"] < 0.3:
                continue
            (x0, y0), (x1, y1) = points[left], points[right]
            steps = max(2, int(max(abs(x1 - x0), abs(y1 - y0))))
            for t in range(steps + 1):
                x = int(round(x0 + (x1 - x0) * t / steps))
                y = int(round(y0 + (y1 - y0) * t / steps))
                if 0 <= y < height and 0 <= x < width:
                    base[y, x] = (0.35, 0.9, 0.45)
        for point, entry in zip(points, person):
            if entry["visibility"] < 0.3:
                continue
            x, y = int(round(point[0])), int(round(point[1]))
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    if 0 <= y + dy < height and 0 <= x + dx < width:
                        base[y + dy, x + dx] = (0.95, 0.85, 0.25)
    return torch.from_numpy(base)[None, ...]
