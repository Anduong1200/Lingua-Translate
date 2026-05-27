# Backend

Canonical backend for Lingua Translate MVP 0.1.

## Run

```bash
python -m pip install -r backend/requirements.txt
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 3001 --reload
```

## Architecture

```text
FastAPI
-> SQLAlchemy
-> SQLite backend/data/hanora.sqlite3
-> jieba + pypinyin
-> dictionary/user correction lookup
-> optional Google Gemini context-reading layer
```

SQLite is the source of truth for documents, pages, annotations, review items, settings, user corrections, and imported dictionary entries.

## Runtime Files

Ignored by git:

```text
backend/.env
backend/data/
backend/data/uploads/
backend/data/backups/
backend/data/google_api_keys.txt
```

## Environment

Copy:

```bash
copy backend\.env.example backend\.env
```

Supported variables:

```text
APP_ENV=development
FRONTEND_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
MAX_UPLOAD_BYTES=52428800
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.txt,.md,.docx
GOOGLE_API_KEYS=key1,key2,key3
GOOGLE_AI_MODEL=gemini-3.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
```

Multiple keys are rotated round-robin. API responses expose only key index and fingerprint.

For production, set `APP_ENV=production` and explicit `FRONTEND_ORIGINS`. Do not use wildcard CORS.

## Migrations

```bash
cd backend
alembic upgrade head
```

The app still performs small runtime schema checks for local upgrades, but production deployments should use Alembic as the source of schema lifecycle.

For CI/staging, point Alembic at a separate SQLite database:

```bash
set DATABASE_URL=sqlite:///D:/tmp/hanora_migration_check.sqlite3
cd backend
alembic upgrade head
```

## Import Data

```bash
python backend\scripts\import_cc_cedict.py path\to\cedict_ts.u8
python backend\scripts\import_hsk_vocab.py path\to\hsk_folder
python backend\scripts\bootstrap_data.py
```

## Operations

Deep health and sanitized config:

```bash
curl http://127.0.0.1:3001/api/health/deep
curl http://127.0.0.1:3001/api/system/config
```

Local backup/export:

```bash
python backend\scripts\backup_database.py
curl -X POST http://127.0.0.1:3001/api/admin/backup
curl http://127.0.0.1:3001/api/admin/export
```

## Tests

```bash
python -m pytest backend\tests
```

Current tests cover:

```text
health
contextual NLP analyze
dictionary search
HSK import priority vs Vietnamese seed
annotation/review/review-event flow
user correction priority
document upload persistence
upload type/size safety
admin backup/export without secret leakage
Google AI key rotation without secret leakage
```
