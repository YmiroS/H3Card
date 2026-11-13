"""通用文本产物节点：把任意 JSON/文本落成 output 里的一个文件。

为什么要自己写：全仓（含整合包）没有任何「落文本文件」的节点，而 ComfyUI 的产物通道
本来就吃任意文件 —— history 项只要带 filename 就会被服务端收走，未知后缀按 kind=file 处理。
补上这一个，姿势、深度、质检报告这类非媒体结果就不需要另造回传协议。
"""
import json
import os

import folder_paths


class ChoukaSaveJson:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"multiline": True, "default": ""}),
                "filename_prefix": ("STRING", {"default": "chouka/pose"}),
            },
            "optional": {
                "filename_suffix": ("STRING", {"default": ""}),
            },
        }

    RETURN_TYPES = ("INT", "STRING")
    RETURN_NAMES = ("bytes", "filename")
    FUNCTION = "save"
    OUTPUT_NODE = True
    CATEGORY = "chouka/输出"
    DESCRIPTION = "把文本（通常是 JSON）写成 output 目录下的一个文件，并在产物清单里回报文件名。"

    def save(self, text, filename_prefix="chouka/pose", filename_suffix=""):
        payload = (text or "").encode("utf-8")
        try:
            json.loads(text or "")
            extension = ".json"
        except json.JSONDecodeError:
            # 不是合法 JSON 也照样落盘，但后缀退回 .txt，别让下游按 JSON 解析到半截崩掉。
            extension = ".txt"
        prefix = f"{filename_prefix}{filename_suffix}"
        full_folder, filename, counter, subfolder, _ = folder_paths.get_save_image_path(
            prefix, folder_paths.get_output_directory(), 1, 1)
        stored = f"{filename}_{counter:05}_{extension[1:]}{extension}"
        temporary = os.path.join(full_folder, stored + ".part")
        with open(temporary, "wb") as stream:
            stream.write(payload)
        os.replace(temporary, os.path.join(full_folder, stored))
        entry = {"filename": stored, "subfolder": subfolder, "type": "output"}
        locator = f"{subfolder}/{stored}" if subfolder else stored
        return {"ui": {"files": [entry], "text": [text]}, "result": (len(payload), locator)}
