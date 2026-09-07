@echo off
setlocal
set "EXTERNAL010_ALLOWED_ORIGINS=https://aturningpointinhistory.github.io,http://localhost:8000,http://127.0.0.1:8000"
set "EXTERNAL010_ACQUISITION_ALLOWED_HOSTS=127.0.0.1"
set "EXTERNAL010_ALLOW_HTTP_ACQUISITION=true"
start "EXTERNAL-010 Phase4 Fixture" cmd /k node phase4_fixture.cjs
start "EXTERNAL-010 Gateway" cmd /k node gateway.cjs
echo Phase 04 PC runtime services started.
echo Fixture: http://127.0.0.1:43120
echo Gateway: http://127.0.0.1:43110
endlocal
