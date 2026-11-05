@echo off
title DoorMaster Web
cd /d "%~dp0"
set "LOG=%~dp0door-master-web.log"

echo Starting DoorMaster in your browser...
echo Keep this window open while the app is running.
echo.

set "EXPO_NO_TELEMETRY=1"
call "%~dp0node_modules\.bin\expo.cmd" start --web > "%LOG%" 2>&1
if errorlevel 1 (
  echo.
  echo Startup failed. Full log:
  type "%LOG%"
  echo.
  echo Please send this screen or the log file to the architect.
  pause
)
