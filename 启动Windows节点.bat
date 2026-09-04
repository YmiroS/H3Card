@echo off
rem Keep this file pure ASCII. Edit the settings below when paths change.
chcp 65001 >nul
cd /d "%~dp0"

set "PY=..\python_embeded\python.exe"
set "COMFY_MAIN=..\ComfyUI\main.py"
set "WORKER=worker\agent.py"
set "WORKER_CONFIG=worker\config.json"
set "COMFY_HOST=127.0.0.1"
set "COMFY_PORT=8188"
set "RESERVE_VRAM=2"
set "COMFY_EXTRA_ARGS=--windows-standalone-build"
set "START_DELAY=8"

if not exist "%PY%" (
  echo Python not found: %PY%
  pause
  exit /b 2
)
if not exist "%COMFY_MAIN%" (
  echo ComfyUI not found: %COMFY_MAIN%
  pause
  exit /b 2
)
if not exist "%WORKER_CONFIG%" (
  echo Worker config not found: %WORKER_CONFIG%
  echo Copy worker\config.example.json to worker\config.json and edit it first.
  pause
  exit /b 2
)
if /i "%~1"=="check" (
  echo Windows node launcher paths are valid.
  exit /b 0
)

"%PY%" -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(s.connect_ex(('%COMFY_HOST%',%COMFY_PORT%)) != 0)"
if errorlevel 1 (
  echo Starting ComfyUI in a new log window...
  start "ComfyUI" cmd /k ""%PY%" -s "%COMFY_MAIN%" %COMFY_EXTRA_ARGS% --listen %COMFY_HOST% --port %COMFY_PORT% --reserve-vram %RESERVE_VRAM%"
  timeout /t %START_DELAY% /nobreak >nul
) else (
  echo ComfyUI is already listening on %COMFY_HOST%:%COMFY_PORT%.
)

echo Starting H3Card Worker in a new log window...
start "H3Card Worker" cmd /k ""%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%""
echo.
echo Windows node started. Keep the ComfyUI and Worker log windows open.
pause
