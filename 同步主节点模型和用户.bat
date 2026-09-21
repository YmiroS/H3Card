@echo off
rem Incrementally copy models and user data from the authoritative node.
rem Robocopy skips files whose size and timestamp already match.
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "SOURCE_ROOT=\\dinghaichouka1.youku.com\E\ComfyUI_Mie_V33"
for %%I in ("%~dp0..") do set "DEST_ROOT=%%~fI"
set "NON_INTERACTIVE=0"
if /i "%~1"=="--non-interactive" set "NON_INTERACTIVE=1"

if /i "%COMPUTERNAME%"=="DINGHAICHOUKA1" (
  echo This is the source node. No synchronization is needed.
  goto success
)

if not exist "%SOURCE_ROOT%\ComfyUI\models\" (
  echo ERROR: Cannot access source models directory:
  echo   %SOURCE_ROOT%\ComfyUI\models
  goto failure
)
if not exist "%SOURCE_ROOT%\ComfyUI\user\" (
  echo ERROR: Cannot access source user directory:
  echo   %SOURCE_ROOT%\ComfyUI\user
  goto failure
)

echo Source:      %SOURCE_ROOT%
echo Destination: %DEST_ROOT%
echo.

call :sync_directory "models" "%SOURCE_ROOT%\ComfyUI\models" "%DEST_ROOT%\ComfyUI\models"
if errorlevel 1 goto failure

call :sync_directory "user" "%SOURCE_ROOT%\ComfyUI\user" "%DEST_ROOT%\ComfyUI\user"
if errorlevel 1 goto failure

echo.
echo Synchronization completed successfully.
echo Files that exist only on this node were not deleted.
goto success

:sync_directory
set "SYNC_NAME=%~1"
echo ============================================================
echo Synchronizing %SYNC_NAME%...
echo ============================================================
set "COPY_OPTIONS=/Z /MT:8"
if /i "%SYNC_NAME%"=="models" set "COPY_OPTIONS=/J /MT:2"
robocopy "%~2" "%~3" /E %COPY_OPTIONS% /R:2 /W:2 /XJ /COPY:DAT /DCOPY:DAT
set "ROBOCOPY_RESULT=%ERRORLEVEL%"
if %ROBOCOPY_RESULT% GEQ 8 (
  echo ERROR: Robocopy failed for %SYNC_NAME% with code %ROBOCOPY_RESULT%.
  exit /b 1
)
echo %SYNC_NAME% synchronized. Robocopy code: %ROBOCOPY_RESULT%
exit /b 0

:failure
set "FINAL_RESULT=1"
goto finish

:success
set "FINAL_RESULT=0"

:finish
if "%NON_INTERACTIVE%"=="0" pause
exit /b %FINAL_RESULT%
