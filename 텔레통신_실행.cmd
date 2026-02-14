@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "AHK_EXE=C:\Program Files\AutoHotkey\AutoHotkeyU64.exe"
set "SCRIPT="

for /f "delims=" %%F in ('dir /b /a:-d /o-d *.ahk') do (
    findstr /c:"CheckTeleCommand:" "%%F" >nul 2>&1
    if not errorlevel 1 (
        set "SCRIPT=%%F"
        goto :run
    )
)

echo [ERROR] execution script not found.
exit /b 1

:run
powershell -NoProfile -ExecutionPolicy Bypass -Command "$name='%SCRIPT%'; Get-CimInstance Win32_Process | Where-Object { $_.Name -like 'AutoHotkey*.exe' -and $_.CommandLine -like ('*' + $name + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
start "" "%AHK_EXE%" /ErrorStdOut "%SCRIPT%"
exit /b 0
