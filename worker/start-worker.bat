@echo off
rem Keep this file pure ASCII. Edit the settings below when paths change.
chcp 65001 >nul
cd /d "%~dp0"

set "PY=..\..\python_embeded\python.exe"
set "WORKER=agent.py"
set "CONFIG=config.json"

if not exist "%PY%" (
  echo Python not found: %PY%
  pause
  exit /b 2
)
if not exist "%CONFIG%" (
  echo Copy config.example.json to config.json and update it first.
  pause
  exit /b 2
)

title H3Card Windows Worker
echo Starting H3Card Worker...
echo Config: %CD%\%CONFIG%
echo Press Ctrl+C to stop.
echo.
"%PY%" -u "%WORKER%" --config "%CONFIG%"
echo.
echo Worker stopped with exit code %ERRORLEVEL%.
pause
