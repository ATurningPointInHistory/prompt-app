@echo off
setlocal
cd /d "%~dp0"

set "LAUNCHER=%~dp0AI_Prompt_OS_Launcher.pyw"

if not exist "%LAUNCHER%" (
    echo Launcher not found:
    echo %LAUNCHER%
    pause
    exit /b 1
)

where pyw >nul 2>&1
if %errorlevel%==0 (
    start "" pyw "%LAUNCHER%"
    exit /b 0
)

where pythonw >nul 2>&1
if %errorlevel%==0 (
    start "" pythonw "%LAUNCHER%"
    exit /b 0
)

echo Python launcher was not found.
echo Try double-clicking AI_Prompt_OS_Launcher.pyw directly.
pause
