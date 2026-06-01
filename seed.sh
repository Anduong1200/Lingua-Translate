#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo "         Hanora Database Seeding Script           "
echo "=================================================="

PYTHON_BIN="${PYTHON_BIN:-python3}"
if [ -x ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
fi

DB_PATH="${HANORA_DB_PATH:-backend/data/hanora.sqlite3}"
if [ -f "$DB_PATH" ]; then
  echo "[*] Removing old SQLite database at $DB_PATH..."
  rm -f "$DB_PATH"
fi
mkdir -p backend/data

echo "[*] Running Alembic migrations..."
PYTHONPATH=backend "$PYTHON_BIN" -m alembic -c backend/alembic.ini upgrade head

IMPORT_ARGS=()
if [ -n "${TRUNGVIET_STARDICT_DIR:-}" ]; then
  IMPORT_ARGS+=(--stardict-dir "$TRUNGVIET_STARDICT_DIR")
elif [ -n "${TRUNGVIET_STARDICT_IDX:-}" ] && [ -n "${TRUNGVIET_STARDICT_DICT:-}" ]; then
  IMPORT_ARGS+=(--stardict-idx "$TRUNGVIET_STARDICT_IDX" --stardict-dict "$TRUNGVIET_STARDICT_DICT")
fi
if [ -n "${HSK_VOCAB_DIR:-${HSK_VOCAB_PATH:-}}" ]; then
  IMPORT_ARGS+=(--hsk-dir "${HSK_VOCAB_DIR:-${HSK_VOCAB_PATH:-}}")
fi
if [ -n "${PHRASE_DIR:-${PHRASE_PATH:-}}" ]; then
  IMPORT_ARGS+=(--phrase-dir "${PHRASE_DIR:-${PHRASE_PATH:-}}")
fi

if [ "${#IMPORT_ARGS[@]}" -gt 0 ]; then
  echo "[*] Importing configured Chinese-Vietnamese dictionary data..."
  PYTHONPATH=backend "$PYTHON_BIN" backend/scripts/import_trungviet_dict.py "${IMPORT_ARGS[@]}"
else
  echo "[*] No external dictionary paths configured. Bootstrapping built-in seed data only."
  PYTHONPATH=backend "$PYTHON_BIN" backend/scripts/bootstrap_data.py
fi

echo "=================================================="
echo "       Database seeding sequence finished!        "
echo "=================================================="
