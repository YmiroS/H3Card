@echo off
rem Synchronize authoritative ComfyUI data to a Windows worker.
rem Default mode synchronizes ComfyUI 0.37 core, H3 customizations, models and user.
rem Use --models-only only when an operator intentionally wants the legacy behavior.
rem Robocopy skips files whose size and timestamp already match.
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

if not defined CHOUKA_SYNC_SOURCE_ROOT set "CHOUKA_SYNC_SOURCE_ROOT=\\dinghaichouka1.youku.com\E\ComfyUI_Mie_V33"
set "SOURCE_ROOT=%CHOUKA_SYNC_SOURCE_ROOT%"
if defined CHOUKA_SYNC_DEST_ROOT (
  set "DEST_ROOT=%CHOUKA_SYNC_DEST_ROOT%"
) else (
  for %%I in ("%~dp0..") do set "DEST_ROOT=%%~fI"
)
set "NON_INTERACTIVE=0"
set "SYNC_CORE=1"
set "DRY_RUN=0"
set "ARG_ERROR="

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--non-interactive" set "NON_INTERACTIVE=1"& shift& goto parse_args
if /i "%~1"=="--upgrade" set "SYNC_CORE=1"& shift& goto parse_args
if /i "%~1"=="--models-only" set "SYNC_CORE=0"& shift& goto parse_args
if /i "%~1"=="--dry-run" set "DRY_RUN=1"& shift& goto parse_args
if not defined ARG_ERROR set "ARG_ERROR=%~1"
shift
goto parse_args

:args_done
if defined ARG_ERROR (
  echo ERROR: Unknown option: %ARG_ERROR%
  echo Supported options: --upgrade --models-only --dry-run --non-interactive
  goto failure
)
set "ROBOCOPY_DRY_RUN="
if "%DRY_RUN%"=="1" set "ROBOCOPY_DRY_RUN=/L"

if /i "%COMPUTERNAME%"=="DINGHAICHOUKA1" (
  echo This is the source node. No synchronization is needed.
  goto success
)
for %%I in ("%SOURCE_ROOT%") do set "SOURCE_COMPARE=%%~fI"
for %%I in ("%DEST_ROOT%") do set "DEST_COMPARE=%%~fI"
if /i "%SOURCE_COMPARE%"=="%DEST_COMPARE%" (
  echo ERROR: Source and destination roots must be different.
  goto failure
)

if not exist "%DEST_ROOT%\ComfyUI\" (
  echo ERROR: Destination ComfyUI directory does not exist:
  echo   %DEST_ROOT%\ComfyUI
  goto failure
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
if "%SYNC_CORE%"=="1" (
  if not exist "%SOURCE_ROOT%\ComfyUI\comfyui_version.py" (
    echo ERROR: Cannot access source ComfyUI core.
    goto failure
  )
  if not exist "%SOURCE_ROOT%\ComfyUI\comfy\ldm\qwen_image21\model.py" (
    echo ERROR: Source ComfyUI does not contain Qwen Image 2.1 core support.
    goto failure
  )
  if not exist "%SOURCE_ROOT%\ComfyUI\comfy_extras\nodes_qwen.py" (
    echo ERROR: Source ComfyUI does not contain Qwen Image 2.1 nodes.
    goto failure
  )
  if not exist "%SOURCE_ROOT%\ComfyUI\models\diffusion_models\qwen_image_2.1_int8_convrot.safetensors" (
    echo ERROR: Source Qwen Image 2.1 diffusion model is missing.
    goto failure
  )
  if not exist "%SOURCE_ROOT%\ComfyUI\models\clip\qwen3vl_8b_fp8_scaled.safetensors" (
    echo ERROR: Source Qwen Image 2.1 text encoder is missing.
    goto failure
  )
  if not exist "%SOURCE_ROOT%\ComfyUI\models\vae\qwen_image_2.1_vae_bf16.safetensors" (
    echo ERROR: Source Qwen Image 2.1 VAE is missing.
    goto failure
  )
)

echo Source:      %SOURCE_ROOT%
echo Destination: %DEST_ROOT%
if "%SYNC_CORE%"=="1" (echo Mode:        ComfyUI upgrade + models + user) else (echo Mode:        models + user only)
if "%DRY_RUN%"=="1" echo DRY RUN:     no files will be changed.
echo.

rem Synchronize large assets first. Core code remains untouched if an asset copy fails.
call :sync_directory "models" "%SOURCE_ROOT%\ComfyUI\models" "%DEST_ROOT%\ComfyUI\models"
if errorlevel 1 goto failure

call :sync_directory "user" "%SOURCE_ROOT%\ComfyUI\user" "%DEST_ROOT%\ComfyUI\user"
if errorlevel 1 goto failure

if "%SYNC_CORE%"=="1" if "%DRY_RUN%"=="0" (
  call :verify_same_size "%SOURCE_ROOT%\ComfyUI\models\diffusion_models\qwen_image_2.1_int8_convrot.safetensors" "%DEST_ROOT%\ComfyUI\models\diffusion_models\qwen_image_2.1_int8_convrot.safetensors"
  if errorlevel 1 goto failure
  call :verify_same_size "%SOURCE_ROOT%\ComfyUI\models\clip\qwen3vl_8b_fp8_scaled.safetensors" "%DEST_ROOT%\ComfyUI\models\clip\qwen3vl_8b_fp8_scaled.safetensors"
  if errorlevel 1 goto failure
  call :verify_same_size "%SOURCE_ROOT%\ComfyUI\models\vae\qwen_image_2.1_vae_bf16.safetensors" "%DEST_ROOT%\ComfyUI\models\vae\qwen_image_2.1_vae_bf16.safetensors"
  if errorlevel 1 goto failure
)

if "%SYNC_CORE%"=="1" (
  call :sync_comfy_core "ComfyUI core" "%SOURCE_ROOT%\ComfyUI" "%DEST_ROOT%\ComfyUI"
  if errorlevel 1 goto failure
  if "%DRY_RUN%"=="1" (
    echo DRY RUN: obsolete ComfyUI 0.37 files would be removed.
  ) else (
    call :remove_obsolete_files "%DEST_ROOT%\ComfyUI"
    if errorlevel 1 goto failure
  )
)

echo.
if "%DRY_RUN%"=="1" (
  echo Dry-run inspection completed successfully. No files were changed.
) else (
  echo Synchronization completed successfully.
  echo Files that exist only on this node were not deleted.
  if "%SYNC_CORE%"=="1" (
    echo IMPORTANT: Update Python packages from ComfyUI\requirements.txt, then restart ComfyUI.
  )
)
goto success

:sync_comfy_core
set "SYNC_NAME=%~1"
echo ============================================================
echo Synchronizing %SYNC_NAME%...
echo ============================================================
robocopy "%~2" "%~3" /E /Z /MT:32 /R:2 /W:2 /XJ /COPY:DAT /DCOPY:DAT %ROBOCOPY_DRY_RUN% ^
  /XD "%~2\models" "%~2\user" "%~2\input" "%~2\output" "%~2\temp" ^
      "%~2\.git" "%~2\.github" "%~2\tests" "%~2\tests-unit" ^
      "%~2\config" "%~2\styles" "%~2\ComfyUI-EditUtils" ^
      ".git" "__pycache__" ".venv" "venv" "node_modules" ^
  /XF "*.pyc" "*.pyo" "*.bak" "*.bak_*"
set "ROBOCOPY_RESULT=%ERRORLEVEL%"
if %ROBOCOPY_RESULT% GEQ 8 (
  echo ERROR: Robocopy failed for %SYNC_NAME% with code %ROBOCOPY_RESULT%.
  exit /b 1
)
echo %SYNC_NAME% synchronized. Robocopy code: %ROBOCOPY_RESULT%
exit /b 0

:sync_directory
set "SYNC_NAME=%~1"
echo ============================================================
echo Synchronizing %SYNC_NAME%...
echo ============================================================
robocopy "%~2" "%~3" /E /Z /MT:32 /R:2 /W:2 /XJ /COPY:DAT /DCOPY:DAT %ROBOCOPY_DRY_RUN%
set "ROBOCOPY_RESULT=%ERRORLEVEL%"
if %ROBOCOPY_RESULT% GEQ 8 (
  echo ERROR: Robocopy failed for %SYNC_NAME% with code %ROBOCOPY_RESULT%.
  exit /b 1
)
echo %SYNC_NAME% synchronized. Robocopy code: %ROBOCOPY_RESULT%
exit /b 0

:remove_obsolete_files
call :remove_file "%~1\app\assets\database\queries\asset.py"
if errorlevel 1 exit /b 1
call :remove_file "%~1\app\assets\database\queries\asset_reference.py"
if errorlevel 1 exit /b 1
call :remove_file "%~1\app\assets\database\queries\common.py"
if errorlevel 1 exit /b 1
call :remove_file "%~1\app\assets\services\bulk_ingest.py"
if errorlevel 1 exit /b 1
exit /b 0

:remove_file
if not exist "%~1" exit /b 0
del /F /Q "%~1"
if errorlevel 1 (
  echo ERROR: Cannot remove obsolete file: %~1
  exit /b 1
)
echo Removed obsolete file: %~1
exit /b 0

:verify_same_size
if not exist "%~1" (
  echo ERROR: Required source file is missing: %~1
  exit /b 1
)
if not exist "%~2" (
  echo ERROR: Required destination file is missing: %~2
  exit /b 1
)
for %%I in ("%~1") do set "SOURCE_SIZE=%%~zI"
for %%I in ("%~2") do set "DEST_SIZE=%%~zI"
if not "%SOURCE_SIZE%"=="%DEST_SIZE%" (
  echo ERROR: Size verification failed for: %~2
  echo Source size: %SOURCE_SIZE%  Destination size: %DEST_SIZE%
  exit /b 1
)
echo Verified: %~2
exit /b 0

:failure
set "FINAL_RESULT=1"
goto finish

:success
set "FINAL_RESULT=0"

:finish
if "%NON_INTERACTIVE%"=="0" pause
exit /b %FINAL_RESULT%
