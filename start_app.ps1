# STAGE Fullstack App Launcher for PowerShell
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

$pythonExe = Join-Path $rootDir "backend\venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    if (Test-Path "C:\sp\ai-agent\ai_agent_env\Scripts\python.exe") {
        $pythonExe = "C:\sp\ai-agent\ai_agent_env\Scripts\python.exe"
    } else {
        $pythonExe = "python"
    }
}

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "             STARTING STAGE FULLSTACK APP          " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

& $pythonExe (Join-Path $rootDir "run_app.py")
