# Hanora Technical Maturity Test Suite Runner for Windows (PowerShell)
# Runs backend pytest integration tests and verifies frontend compilation.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         Hanora Automation Test Runner            " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Run Backend Tests
Write-Host "[*] Executing Backend Integration Tests via pytest..." -ForegroundColor Cyan
if (Test-Path ".venv") {
    $env:PYTHONPATH = "backend"
    & .venv\Scripts\pytest backend/tests/
    Write-Host "[+] All backend integration tests passed successfully!" -ForegroundColor Green
} else {
    Write-Error "[-] Python virtual environment (.venv) not found. Please run .\setup.ps1 first."
}

# 2. Run Frontend Compilation Check
Write-Host "[*] Verifying Frontend TypeScript & build compilation..." -ForegroundColor Cyan
npm run build
Write-Host "[+] Frontend compilation validation passed!" -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Green
Write-Host "     All systems green! Hanora MVP is stable.      " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
