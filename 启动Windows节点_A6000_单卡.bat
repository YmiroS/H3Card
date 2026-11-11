@echo off
setlocal
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
set "RESERVE_VRAM=4"
set "COMFY_EXTRA_ARGS=--windows-standalone-build"
set "CUDA_DEVICE_ORDER=PCI_BUS_ID"
set "CUDA_VISIBLE_DEVICES=0"

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
if not exist "%WORKER%" (
  echo Worker not found: %WORKER%
  exit /b 2
)
if not exist "%WORKER_CONFIG%" (
  echo Worker config not found: %WORKER_CONFIG%
  echo Copy worker\config.example.json to worker\config.json and configure it locally.
  echo Keep the existing config and state file if this installation is already registered.
  if /i not "%~1"=="--comfy-only" if /i not "%~1"=="--no-pause" pause
  exit /b 2
)
if not exist "%RESTART_HELPER%" (
  echo Restart helper not found: %RESTART_HELPER%
  exit /b 2
)
if /i "%~1"=="check" (
  echo Single-GPU RTX A6000 launcher paths are valid. No services started.
  echo CUDA_VISIBLE_DEVICES=0; CUDA_DEVICE_ORDER=PCI_BUS_ID.
  echo ComfyUI args: %COMFY_EXTRA_ARGS% --listen %COMFY_HOST% --port %COMFY_PORT% --reserve-vram %RESERVE_VRAM%
  echo This launcher does not restrict model precision or workflow parameters.
  exit /b 0
)
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"
if errorlevel 1 (
  echo Cannot create log directory: %LOG_DIR%
  exit /b 2
)

"%PY%" -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(s.connect_ex(('%COMFY_HOST%',%COMFY_PORT%)) != 0)"
if errorlevel 1 (
  echo Starting single-GPU RTX A6000 ComfyUI... Log: %COMFY_LOG%
  start "ComfyUI RTX A6000 Single" "%PY%" -s "%COMFY_MAIN%" %COMFY_EXTRA_ARGS% --listen %COMFY_HOST% --port %COMFY_PORT% --reserve-vram %RESERVE_VRAM% 1>>"%COMFY_LOG%" 2>&1
) else (
  echo ComfyUI is already listening on %COMFY_HOST%:%COMFY_PORT%.
  echo Existing processes keep their original GPU selection and launch arguments.
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
  echo A Worker is already running for this config. No duplicate was started.
  echo Existing processes are not reconfigured by this launcher.
  if /i not "%~1"=="--no-pause" pause
  exit /b 0
)
if not "%WORKER_STATUS%"=="1" (
  echo Cannot verify whether H3Card Worker is already running.
  exit /b 4
)
echo Starting H3Card Worker for platform registration and heartbeat... Log: %WORKER_LOG%
start "H3Card Worker A6000 Single" "%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" 1>>"%WORKER_LOG%" 2>&1
set /a WORKER_WAIT=0
:wait_worker_start
"%PY%" -c "import time; time.sleep(1)"
"%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" --instance-status >nul 2>&1
if not errorlevel 1 goto worker_started
set /a WORKER_WAIT+=1
if %WORKER_WAIT% LSS 15 goto wait_worker_start
echo H3Card Worker failed to start. See %WORKER_LOG%.
exit /b 5
:worker_started
"%PY%" -c "import time; time.sleep(2)"
"%PY%" -u "%WORKER%" --config "%WORKER_CONFIG%" --instance-status >nul 2>&1
if errorlevel 1 (
  echo H3Card Worker exited during startup. See %WORKER_LOG%.
  exit /b 5
)
echo.
echo ComfyUI is ready and one local Worker is running.
echo Confirm registration, heartbeat, GPU and resource readiness on the ChouKa platform.
echo Local process startup alone does not prove successful platform registration.
if /i not "%~1"=="--no-pause" pause
exit /b 0
