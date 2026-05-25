@echo off
cd /d "%~dp0"

echo Starting OpenPose Editor Standalone...
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo Python 3 is not installed or not found in PATH.
    echo Please install Python 3 and try again.
    echo.
    pause
    exit /b 1
)

start http://127.0.0.1:7865/

python standalone_server.py

echo.
echo OpenPose Editor Standalone has stopped.
pause