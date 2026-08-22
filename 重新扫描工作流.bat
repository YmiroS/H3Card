@echo off
chcp 65001 >nul
cd /d %~dp0
..\python_embeded\python.exe server\scan_workflows.py %*
pause
