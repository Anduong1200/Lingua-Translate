$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         Hanora Database Seeding Script           " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$PythonBin = if (Test-Path ".venv\Scripts\python.exe") { ".venv\Scripts\python.exe" } else { "python" }
$DbPath = if ($env:HANORA_DB_PATH) { $env:HANORA_DB_PATH } else { "backend\data\hanora.sqlite3" }

if (Test-Path $DbPath) {
    Write-Host "[*] Removing old SQLite database at $DbPath..." -ForegroundColor Yellow
    Remove-Item -LiteralPath $DbPath -Force
}
New-Item -ItemType Directory -Path "backend\data" -Force | Out-Null

Write-Host "[*] Running Alembic migrations..." -ForegroundColor Cyan
$env:PYTHONPATH = "backend"
& $PythonBin -m alembic -c backend/alembic.ini upgrade head

$ImportArgs = @()
if ($env:TRUNGVIET_STARDICT_DIR) {
    $ImportArgs += @("--stardict-dir", $env:TRUNGVIET_STARDICT_DIR)
} elseif ($env:TRUNGVIET_STARDICT_IDX -and $env:TRUNGVIET_STARDICT_DICT) {
    $ImportArgs += @("--stardict-idx", $env:TRUNGVIET_STARDICT_IDX, "--stardict-dict", $env:TRUNGVIET_STARDICT_DICT)
}
if ($env:HSK_VOCAB_DIR) {
    $ImportArgs += @("--hsk-dir", $env:HSK_VOCAB_DIR)
} elseif ($env:HSK_VOCAB_PATH) {
    $ImportArgs += @("--hsk-dir", $env:HSK_VOCAB_PATH)
}
if ($env:PHRASE_DIR) {
    $ImportArgs += @("--phrase-dir", $env:PHRASE_DIR)
} elseif ($env:PHRASE_PATH) {
    $ImportArgs += @("--phrase-dir", $env:PHRASE_PATH)
}

if ($ImportArgs.Count -gt 0) {
    Write-Host "[*] Importing configured Chinese-Vietnamese dictionary data..." -ForegroundColor Cyan
    & $PythonBin backend/scripts/import_trungviet_dict.py @ImportArgs
} else {
    Write-Host "[*] No external dictionary paths configured. Bootstrapping built-in seed data only." -ForegroundColor Yellow
    & $PythonBin backend/scripts/bootstrap_data.py
}

Write-Host "==================================================" -ForegroundColor Green
Write-Host "       Database seeding sequence finished!        " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
