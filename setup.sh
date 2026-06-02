#!/bin/bash
# Hanora Technical Maturity Setup Script for Linux/macOS
# Installs backend Python virtual environment dependencies and frontend Node packages.

set -e

echo "=================================================="
echo "         Hanora Environment Setup Script          "
echo "=================================================="

# 1. Verify Python Installation
if command -v python3 &>/dev/null; then
    PYTHON_VER=$(python3 --version)
    echo "[+] Python detected: $PYTHON_VER"
else
    echo "[-] Python 3 is not installed or not in PATH. Please install Python 3.10+ and try again." >&2
    exit 1
fi

# 2. Verify Node/npm Installation
if command -v npm &>/dev/null; then
    NPM_VER=$(npm --version)
    echo "[+] Node npm detected: v$NPM_VER"
else
    echo "[-] Node.js/npm is not installed or not in PATH. Please install Node.js and try again." >&2
    exit 1
fi

# 3. Create Python virtual environment (.venv)
if [ ! -d ".venv" ]; then
    echo "[*] Creating Python virtual environment in .venv..."
    python3 -m venv .venv
    echo "[+] Virtual environment created."
else
    echo "[+] Python virtual environment (.venv) already exists."
fi

# 4. Create local env files from examples when missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "[+] Created .env from .env.example."
fi
if [ ! -f "backend/.env" ] && [ -f "backend/.env.example" ]; then
    cp backend/.env.example backend/.env
    echo "[+] Created backend/.env from backend/.env.example."
fi

# 5. Install python dependencies
echo "[*] Upgrading pip and installing backend dependencies..."
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r backend/requirements.txt
echo "[+] Backend Python dependencies installed successfully."

# 6. Install frontend npm dependencies
echo "[*] Installing frontend Node.js packages..."
npm install
echo "[+] Frontend packages installed successfully."

# 7. Install Playwright browser used by E2E tests
echo "[*] Installing Playwright Chromium browser..."
npx playwright install chromium
echo "[+] Playwright Chromium installed successfully."

# 8. Prepare local database schema and deterministic seed data
echo "[*] Applying Alembic migrations..."
.venv/bin/python -m alembic upgrade head
echo "[+] Database schema is ready."

echo "[*] Bootstrapping local demo/dictionary data..."
.venv/bin/python backend/scripts/bootstrap_data.py
echo "[+] Local seed data is ready."

echo "=================================================="
echo "  Hanora setup complete! You are ready to develop. "
echo "=================================================="
