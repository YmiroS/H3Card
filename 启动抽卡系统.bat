@echo off
rem Keep this file pure ASCII. Edit the settings below when paths or ports change.
chcp 65001 >nul
cd /d "%~dp0"

set "PY=..\python_embeded\python.exe"
set "CHOUKA_EXECUTION_MODE=local"
set "CHOUKA_PORT=8199"
set "CHOUKA_COMFY_URL=http://127.0.0.1:8188"
set "CHOUKA_DEBUG="

if not exist "%PY%" (
  echo Python not found: %PY%
  pause
  exit /b 2
)
if /i "%~1"=="check" (
  echo Chouka Web launcher paths are valid.
  exit /b 0
)

title Chouka Web
"%PY%" server\boot.py
if errorlevel 3 goto done
echo Starting Chouka Web at http://127.0.0.1:%CHOUKA_PORT%/
echo Press Ctrl+C to stop. Logs are shown below.
echo.
"%PY%" -u server\app.py
:done
pause
