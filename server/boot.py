# -*- coding: utf-8 -*-
"""开抽卡系统之前先把 ComfyUI 弄起来。

为什么这段不写在 .bat 里：cmd.exe 是按「字节偏移」回读批处理文件的，一旦文件里
有多字节字符（中文）又用了 goto 循环，它跳回去的位置会错在字符中间，整行被切开，
于是满屏 "'xxx' 不是内部或外部命令"。所以 .bat 保持纯 ASCII，中文和循环都放这里。

用法：启动抽卡系统.bat 里先跑这个，再跑 app.py。
退出码 0 = 继续开抽卡系统（ComfyUI 起不来也照样开，它后起来网页会自己连上）；
退出码 3 = 抽卡系统已经在跑了，别再开一个（8199 会撞端口）。
"""
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent      # chouka/
PACK = ROOT.parent                                 # 整合包根目录
COMFY_BAT = PACK / "1_1点击启动comfyui.bat"        # 整合包原来的启动脚本，不改它
PORT = 8188
CHOUKA_PORT = 8199
WAIT_SEC = 300                                     # 首次载模型/装节点可能要几分钟


def up(port=PORT):
    try:
        socket.create_connection(("127.0.0.1", port), 1).close()
        return True
    except OSError:
        return False


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    if up(CHOUKA_PORT):
        print(f"[抽卡系统] 已经在跑了 -> http://127.0.0.1:{CHOUKA_PORT}")
        print("           直接用浏览器打开上面这个地址就行，不用再开一个。")
        print("           要重启（比如刚加了新能力）先关掉那个黑窗口。")
        sys.exit(3)

    if up():
        print(f"[抽卡系统] ComfyUI 已在运行 (127.0.0.1:{PORT})")
        return
    if not COMFY_BAT.exists():
        print(f"[抽卡系统] 找不到 {COMFY_BAT.name}，请先自己把 ComfyUI 开起来")
        return

    print(f"[抽卡系统] 正在启动 ComfyUI（{COMFY_BAT.name}）... 它会自己开一个窗口，别关那个窗口")
    subprocess.Popen(["cmd", "/c", str(COMFY_BAT)], cwd=str(PACK),
                     creationflags=subprocess.CREATE_NEW_CONSOLE)

    deadline = time.time() + WAIT_SEC
    while time.time() < deadline:
        if up():
            print("\n[抽卡系统] ComfyUI 就绪")
            return
        print(".", end="", flush=True)
        time.sleep(2)

    print(f"\n[抽卡系统] 等了 {WAIT_SEC // 60} 分钟 ComfyUI 还没应答，先把抽卡系统开起来。")
    print("           去 ComfyUI 那个窗口看看报了什么错，它起来后网页会自动连上。")


if __name__ == "__main__":
    main()
