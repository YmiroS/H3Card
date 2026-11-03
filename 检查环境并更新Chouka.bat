@echo off
rem Keep this launcher ASCII; all Chinese messages live in the UTF-8 PowerShell script.
setlocal
chcp 65001 >nul
set "SCRIPT=%~dp0tools\check-environment.ps1"
if not exist "%SCRIPT%" set "SCRIPT=%~dp0check-environment.ps1"
if not exist "%SCRIPT%" (
  echo Missing check-environment.ps1. Copy it beside this BAT, or keep the tools folder.
  pause
  exit /b 2
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "RESULT=%ERRORLEVEL%"
if not defined CHOUKA_NO_PAUSE pause
exit /b %RESULT%
