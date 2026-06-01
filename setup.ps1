# Hanora Technical Maturity Setup Script for Windows (PowerShell)
# Installs backend Python virtual environment dependencies and frontend Node packages.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         Hanora Environment Setup Script          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verify Python Installation
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    $PythonVer = python --version
    Write-Host "[+] Python detected: $PythonVer" -ForegroundColor Green
} else {
    Write-Error "[-] Python is not installed or not in PATH. Please install Python 3.10+ and try again."
}

# 2. Verify Node/npm Installation
if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    $NpmVer = npm --version
    Write-Host "[+] Node npm detected: v$NpmVer" -ForegroundColor Green
} else {
    Write-Error "[-] Node.js/npm is not installed or not in PATH. Please install Node.js and try again."
}

# 3. Create Python virtual environment (.venv)
if (-not (Test-Path ".venv")) {
    Write-Host "[*] Creating Python virtual environment in .venv..." -ForegroundColor Cyan
    python -m venv .venv
    Write-Host "[+] Virtual environment created." -ForegroundColor Green
} else {
    Write-Host "[+] Python virtual environment (.venv) already exists." -ForegroundColor Green
}

# 4. Install python dependencies
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Copy-Item ".env.example" ".env"
    Write-Host "[+] Created .env from .env.example." -ForegroundColor Green
}
if (-not (Test-Path "backend\.env") -and (Test-Path "backend\.env.example")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "[+] Created backend/.env from backend/.env.example." -ForegroundColor Green
}

Write-Host "[*] Upgrading pip and installing backend dependencies..." -ForegroundColor Cyan
& .venv\Scripts\pip install --upgrade pip
& .venv\Scripts\pip install -r backend/requirements.txt
Write-Host "[+] Backend Python dependencies installed successfully." -ForegroundColor Green

# 5. Install frontend npm dependencies
Write-Host "[*] Installing frontend Node.js packages..." -ForegroundColor Cyan
npm install
Write-Host "[+] Frontend packages installed successfully." -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Hanora setup complete! You are ready to develop. " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
