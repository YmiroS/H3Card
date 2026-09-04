@echo off
chcp 65001 >nul
cd /d %~dp0
set "PY=..\..\python_embeded\python.exe"
if not exist config.json (
  echo Copy config.example.json to config.json and update it first.
  pause
  exit /b 2
)
"%PY%" agent.py --config config.json
pause
