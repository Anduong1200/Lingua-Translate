# Backend

Canonical backend for Hanora MVP 0.1.

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
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.txt,.md,.docx
MAX_UPLOAD_BYTES=52428800
UPLOAD_RATE_LIMIT_PER_MINUTE=20
AI_RATE_LIMIT_PER_MINUTE=30
GOOGLE_API_KEYS=key1,key2,key3
GOOGLE_AI_MODEL=gemini-3.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
TESSERACT_CMD=tesseract
POPPLER_PATH=
```

Multiple keys are rotated round-robin. When one key hits rate limits (429) or quota errors (403), the system automatically tries the next key. API responses never expose raw keys, only `key_index` and `key_fingerprint` (SHA-256 first 10 chars).

**Full setup guide with architecture diagrams:** See [GOOGLE_AI_SETUP.md](GOOGLE_AI_SETUP.md).

For production, set `APP_ENV=production` and explicit `FRONTEND_ORIGINS`. Do not use wildcard CORS.

## OCR (Scanned PDFs)

The backend uses Tesseract OCR with OpenCV preprocessing to extract text from scanned PDFs. When a PDF has no text layer, the system automatically falls back to OCR.

System requirements (must be installed on the host machine):
- **Tesseract OCR** with `chi_sim` (Simplified Chinese) language data
- **Poppler** (for pdf2image to convert PDF pages to images)

Configure via environment variables if not on PATH:

```text
TESSERACT_CMD=/usr/bin/tesseract
POPPLER_PATH=/usr/bin
```

## Migrations

```bash
cd backend
alembic upgrade head
```

The app still performs small runtime schema checks for local upgrades, but production deployments should use Alembic as the source of schema lifecycle.

For CI/staging, point Alembic at a separate SQLite database:

```bash
export DATABASE_URL=sqlite:////tmp/hanora_migration_check.sqlite3
cd backend
alembic upgrade head
```

## Import Data

```bash
python backend/scripts/import_cc_cedict.py path/to/cedict_ts.u8
python backend/scripts/import_hsk_vocab.py path/to/hsk_folder
python backend/scripts/import_trungviet_dict.py --stardict-dir path/to/TrungViet --hsk-dir path/to/hsk --phrase-dir path/to/phrase
python backend/scripts/bootstrap_data.py
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
python backend\scripts\restore_database.py hanora_YYYYMMDDTHHMMSSZ.sqlite3
curl -X POST http://127.0.0.1:3001/api/admin/backup
curl -X POST http://127.0.0.1:3001/api/admin/restore -H "Content-Type: application/json" -d "{\"file_name\":\"hanora_YYYYMMDDTHHMMSSZ.sqlite3\"}"
curl http://127.0.0.1:3001/api/admin/export
```

Restore only accepts file names already present in `backend/data/backups`.

Docker Compose from repository root:

```bash
docker compose up --build
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
document translation/vocabulary automation
upload type/size safety
admin backup/export without secret leakage
Google AI key rotation without secret leakage
```
