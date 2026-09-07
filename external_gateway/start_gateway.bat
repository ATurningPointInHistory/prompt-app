@echo off
setlocal
cd /d "%~dp0"
echo EXTERNAL-010 Local Gateway
node --version
node gateway.cjs
endlocal
