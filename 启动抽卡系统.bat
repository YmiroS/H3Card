@echo off
chcp 65001 >nul
cd /d %~dp0
echo [抽卡系统] 正在启动... 请先确保 ComfyUI 已启动 (127.0.0.1:8188)
..\python_embeded\python.exe server\app.py
pause
