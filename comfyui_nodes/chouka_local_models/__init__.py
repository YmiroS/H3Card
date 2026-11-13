"""ChouKa 本机模型节点包：把打光链路用到的本地模型（分割 / 点框选 / 姿势）做成 ComfyUI 能力。

包内只放「需要模型文件」的部分；回贴、接地、合成这些纯 cv2 运算仍留在服务进程里，
搬过来省不掉依赖，只会让一次识别变成两次跨机传图。
"""
from .nodes_pose import ChoukaRtmw3dPose, ChoukaRtmwPose
from .nodes_save_json import ChoukaSaveJson
from .nodes_segment import (ChoukaFaceSeg, ChoukaPersonSeg, ChoukaSamPrompt,
                            ChoukaSaveIdentityLayer, ChoukaSegMerge)

NODE_CLASS_MAPPINGS = {
    "ChoukaPersonSeg": ChoukaPersonSeg,
    "ChoukaFaceSeg": ChoukaFaceSeg,
    "ChoukaSamPrompt": ChoukaSamPrompt,
    "ChoukaSegMerge": ChoukaSegMerge,
    "ChoukaSaveIdentityLayer": ChoukaSaveIdentityLayer,
    "ChoukaRtmwPose": ChoukaRtmwPose,
    "ChoukaRtmw3dPose": ChoukaRtmw3dPose,
    "ChoukaSaveJson": ChoukaSaveJson,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ChoukaPersonSeg": "ChouKa 人物实例分割",
    "ChoukaFaceSeg": "ChouKa 人脸检出",
    "ChoukaSamPrompt": "ChouKa SAM2 补漏/点框选",
    "ChoukaSegMerge": "ChouKa 身份合并编号",
    "ChoukaSaveIdentityLayer": "ChouKa 保存身份索引层",
    "ChoukaRtmwPose": "ChouKa RTMW 全身姿势",
    "ChoukaRtmw3dPose": "ChouKa RTMW3D 姿势（带相对深度）",
    "ChoukaSaveJson": "ChouKa 保存文本产物",
}

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]
