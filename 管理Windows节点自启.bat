@echo off
rem Windows boot startup manager. Keep this file ASCII-only.
setlocal EnableExtensions DisableDelayedExpansion
set "INTERACTIVE=0"
set "RESULT=0"
if "%~1"=="" set "INTERACTIVE=1"
cd /d "%~dp0"
if errorlevel 1 goto directory_error
if not exist "%~dp0worker\autostart.ps1" goto missing_script
if "%~1"=="" goto menu
if /i "%~1"=="install" goto install
if /i "%~1"=="status" goto status
if /i "%~1"=="remove" goto remove
if /i "%~1"=="check" goto check

echo Usage: %~nx0 [install^|status^|remove^|check]
set "RESULT=2"
goto finish

:menu
echo.
echo Chouka Windows node - machine boot startup
echo Install/Remove: right-click this BAT and select Run as administrator.
echo No automatic elevation, service start, service stop, or reboot is performed.
echo.
echo 1. Install startup task - run before sign-in
echo 2. View task status - NOT service health
echo 3. Remove startup task - keep existing services running
echo 4. Read-only startup precheck - no Task Scheduler access
echo 0. Exit
choice /c 12340 /n /m "Select [1/2/3/4/0]: "
if errorlevel 255 goto choice_error
if errorlevel 5 goto finish
if errorlevel 4 goto check
if errorlevel 3 goto remove
if errorlevel 2 goto status
if errorlevel 1 goto install
goto choice_error

:install
echo Install requires an administrator console and the current Windows account password, not PIN.
set "ACTION=Install"
goto run

:status
set "ACTION=Status"
goto run

:remove
echo Remove requires an administrator console. It does not stop existing services.
set "ACTION=Remove"
goto run

:check
set "ACTION=Check"
goto run

:run
rem Process-scoped RemoteSigned only; machine/user policy is not changed.
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File "%~dp0worker\autostart.ps1" -Action %ACTION%
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" echo Startup management failed. Exit code: %RESULT%
goto finish

:directory_error
echo ERROR: Cannot enter the installation directory.
set "RESULT=2"
goto finish

:missing_script
echo ERROR: worker\autostart.ps1 is missing.
set "RESULT=2"
goto finish

:choice_error
echo ERROR: Cannot read the menu selection.
set "RESULT=2"

:finish
if "%INTERACTIVE%"=="1" pause
endlocal & exit /b %RESULT%
