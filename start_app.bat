@echo off
title STAGE Fullstack App Launcher
cd /d "%~dp0"

echo ===================================================
echo             STARTING STAGE FULLSTACK APP
echo ===================================================

if exist "backend\venv\Scripts\python.exe" (
    set "PYTHON_CMD=backend\venv\Scripts\python.exe"
) else if exist "C:\sp\ai-agent\ai_agent_env\Scripts\python.exe" (
    set "PYTHON_CMD=C:\sp\ai-agent\ai_agent_env\Scripts\python.exe"
) else (
    set "PYTHON_CMD=python"
)

"%PYTHON_CMD%" run_app.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [!] App exited with error code %ERRORLEVEL%.
    pause
)
