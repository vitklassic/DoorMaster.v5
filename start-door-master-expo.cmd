@echo off
title DoorMaster Expo (web + phone)
cd /d "%~dp0"
set "EXPO_NO_TELEMETRY=1"
call "%~dp0node_modules\.bin\expo.cmd" start
if errorlevel 1 pause
