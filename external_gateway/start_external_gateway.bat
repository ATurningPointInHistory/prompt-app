@echo off
setlocal
cd /d "%~dp0"
node start_external_gateway.cjs
endlocal
