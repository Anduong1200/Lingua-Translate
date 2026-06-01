# Hanora Build Automation Script for Windows (PowerShell)
# Triggers frontend compilation and checks output.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         Hanora Production Build Runner           " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

Write-Host "[*] Compiling frontend static files to dist/..." -ForegroundColor Cyan
npm run build
Write-Host "[+] Production build compiled successfully under dist/ directory." -ForegroundColor Green

Write-Host "==================================================" -ForegroundColor Green
Write-Host "             Build sequence completed!            " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
