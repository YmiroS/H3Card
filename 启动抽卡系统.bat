@echo off
rem Keep this file pure ASCII: cmd.exe seeks batch files by byte offset, so
rem non-ASCII text plus goto/labels makes it resume mid-character and garble
rem every following line. All Chinese output lives in the .py files.
chcp 65001 >nul
cd /d %~dp0
set "PY=..\python_embeded\python.exe"
%PY% server\boot.py
if errorlevel 3 goto done
%PY% server\app.py
:done
pause
