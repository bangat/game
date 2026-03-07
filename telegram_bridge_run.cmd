@echo off
setlocal EnableExtensions
cd /d "%~dp0"

dotnet build ".\telegram_vscode_bridge\MiniGameTelegramBridge.csproj" -c Release
if errorlevel 1 exit /b 1

set "EXE=.\telegram_vscode_bridge\bin\Release\net8.0-windows\MiniGameTelegramBridge.exe"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%EXE%' -WindowStyle Hidden"
exit /b 0
