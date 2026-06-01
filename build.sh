#!/bin/bash
# Hanora Build Automation Script for Linux/macOS
# Triggers frontend compilation and checks output.

set -e

echo "=================================================="
echo "         Hanora Production Build Runner           "
echo "=================================================="

echo "[*] Compiling frontend static files to dist/..."
npm run build
echo "[+] Production build compiled successfully under dist/ directory."

echo "=================================================="
echo "             Build sequence completed!            "
echo "=================================================="
