@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0push_notify.ps1" %*
exit /b %errorlevel%
