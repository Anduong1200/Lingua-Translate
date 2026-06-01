#!/bin/bash
# Hanora Technical Maturity Test Suite Runner for Linux/macOS
# Runs backend pytest integration tests and verifies frontend compilation.

set -e

echo "=================================================="
echo "         Hanora Automation Test Runner            "
echo "=================================================="

# 1. Run Backend Tests
echo "[*] Executing Backend Integration Tests via pytest..."
if [ -d ".venv" ]; then
    export PYTHONPATH="backend"
    .venv/bin/pytest backend/tests/
    echo "[+] All backend integration tests passed successfully!"
else
    echo "[-] Python virtual environment (.venv) not found. Please run ./setup.sh first." >&2
    exit 1
fi

# 2. Run Frontend Compilation Check
echo "[*] Verifying Frontend TypeScript & build compilation..."
npm run build
echo "[+] Frontend compilation validation passed!"

echo "=================================================="
echo "     All systems green! Hanora MVP is stable.      "
echo "=================================================="
