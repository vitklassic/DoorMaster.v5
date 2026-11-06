@echo off
chcp 65001 >nul
title DoorMaster TEST (full diagnostics)
cd /d "%~dp0"

echo ============================================================
echo  DoorMaster - TEST MODE
echo.
echo  - Full error details are ON from the first launch
echo  - Errors appear in the app AND in this window
echo  - Passwords, tokens and keys are masked automatically
echo.
echo  Phone: scan the QR code with Expo Go (SDK 57, expo.dev/go)
echo  Web:   press "w" in this window
echo.
echo  To send diagnostics: screenshot the error in the app
echo  or copy the text from this window (right click - Mark).
echo  Do NOT close this window while testing.
echo ============================================================
echo.

set "EXPO_NO_TELEMETRY=1"
set "EXPO_PUBLIC_TEST_MODE=1"
call "%~dp0node_modules\.bin\expo.cmd" start
if errorlevel 1 (
  echo.
  echo Startup failed. Copy the text above and send it to the architect.
  pause
)
