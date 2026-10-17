@echo off
rem Keep this file pure ASCII. RTX 4090 low-VRAM launcher.
chcp 65001 >nul
cd /d "%~dp0"

set "PY=..\python_embeded\python.exe"
set "COMFY_MAIN=..\ComfyUI\main.py"
set "WORKER=worker\agent.py"
set "WORKER_CONFIG=worker\config.json"
set "RESTART_HELPER=worker\restart_node.py"
set "LOG_DIR=worker\logs"
set "COMFY_LOG=%LOG_DIR%\comfy.log"
set "WORKER_LOG=%LOG_DIR%\worker.log"
set "COMFY_HOST=127.0.0.1"
set "COMFY_PORT=8188"
set "RESERVE_VRAM=3"
set "COMFY_EXTRA_ARGS=--windows-standalone-build --lowvram"

if not exist "%PY%" (
  echo Python not found: %PY%
  if /i not "%~1"=="--comfy-only" if /i not "%~1"=="--no-pause" pause
  exit /b 2
)
if not exist "%COMFY_MAIN%" (
  echo ComfyUI not found: %COMFY_MAIN%
  if /i not "%~1"=="--comfy-only" if /i not "%~1"=="--no-pause" pause
  exit /b 2
)
if not exist "%WORKER_CONFIG%" (
  echo Worker config not found: %WORKER_CONFIG%
  echo Copy worker\config.example.json to worker\config.json and edit it first.
  if /i not "%~1"=="--comfy-only" if /i not "%~1"=="--no-pause" pause
  exit /b 2
)
if not exist "%RESTART_HELPER%" (
  echo Restart helper not found: %RESTART_HELPER%
  exit /b 2
)
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if errorlevel 1 (
  echo Cannot create log directory: %LOG_DIR%
  exit /b 2
)
if /i "%~1"=="check" (
  echo Windows RTX 4090 node launcher paths are valid.
  exit /b 0
)

"%PY%" -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(s.connect_ex(('%COMFY_HOST%',%COMFY_PORT%)) != 0)"
if errorlevel 1 (
  echo Starting ComfyUI in RTX 4090 low-VRAM mode... Log: %COMFY_LOG%
  start "ComfyUI RTX 4090" "%PY%" -s "%COMFY_MAIN%" %COMFY_EXTRA_ARGS% --listen %COMFY_HOST% --port %COMFY_PORT% --reserve-vram %RESERVE_VRAM% 1>>"%COMFY_LOG%" 2>&1
) else (
  echo ComfyUI is already listening on %COMFY_HOST%:%COMFY_PORT%.
)

if /i "%~1"=="--comfy-start-only" exit /b 0
"%PY%" -u "%RESTART_HELPER%" --wait-comfy --config "%WORKER_CONFIG%"
if errorlevel 1 (
  echo ComfyUI failed readiness checks. See %COMFY_LOG% and %LOG_DIR%\restart-node.log.
  exit /b 3
)
if /i "%~1"=="--comfy-only" exit /b 0

"%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" --instance-status >nul 2>&1
set "WORKER_STATUS=%ERRORLEVEL%"
if "%WORKER_STATUS%"=="0" (
  echo H3Card Worker is already running for %WORKER_CONFIG%. No duplicate was started.
  if /i not "%~1"=="--no-pause" pause
  exit /b 0
)
if not "%WORKER_STATUS%"=="1" (
  echo Cannot verify whether H3Card Worker is already running.
  exit /b 4
)
echo Starting H3Card Worker... Log: %WORKER_LOG%
start "H3Card Worker" "%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" 1>>"%WORKER_LOG%" 2>&1
set /a WORKER_WAIT=0
:wait_worker_start
 timeout /t 1 /nobreak >nul
"%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" --instance-status >nul 2>&1
if not errorlevel 1 goto worker_started
set /a WORKER_WAIT+=1
if %WORKER_WAIT% LSS 15 goto wait_worker_start
echo H3Card Worker failed to start. See %WORKER_LOG%.
exit /b 5
:worker_started
 timeout /t 2 /nobreak >nul
"%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" --instance-status >nul 2>&1
if errorlevel 1 (
  echo H3Card Worker exited during startup. See %WORKER_LOG%.
  exit /b 5
)
echo.
echo Windows RTX 4090 node started. ComfyUI is ready and one Worker is running.
if /i not "%~1"=="--no-pause" pause
exit /b 0
