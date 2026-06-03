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

Usually runtime/local-only:

```text
backend/.env
backend/data/uploads/
backend/data/backups/
backend/data/google_api_keys.txt
```

`backend/data/hanora.sqlite3` may be present in the repository for demo/bootstrap convenience, but it is not the canonical source for dictionary data. Test runs, upload flows, `POST /api/debug/reset-demo`, and local usage can mutate it. For release work, use `data/raw/` plus `python backend/scripts/bootstrap_data.py` as the reproducible dictionary source.

## Environment

Copy:

```bash
cp backend/.env.example backend/.env
```

Supported variables:

```text
APP_ENV=development
FRONTEND_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.txt,.md,.docx
MAX_UPLOAD_BYTES=52428800
UPLOAD_RATE_LIMIT_PER_MINUTE=20
AI_RATE_LIMIT_PER_MINUTE=30
AI_DAILY_REQUEST_LIMIT=100
AI_DAILY_TOKEN_LIMIT=100000
AI_MAX_PROMPT_CHARS=12000
AI_CIRCUIT_BREAKER_ERROR_LIMIT=10
AI_CIRCUIT_BREAKER_WINDOW_MINUTES=60
GOOGLE_API_KEYS=key1,key2,key3
GOOGLE_AI_MODEL=gemini-2.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
TESSERACT_CMD=tesseract
POPPLER_PATH=
```

Multiple keys are rotated round-robin for BYOK, environment fallback, or dev/staging/prod separation. This is not intended for quota bypass. If one key hits rate limits or quota errors, the AI layer returns a controlled error and the next request advances through the pool. API responses never expose raw keys, only `key_index` and `key_fingerprint` (SHA-256 first 10 chars).

AI context sharing is consent-gated. `GET /api/ai/consent` returns the current local consent policy and `PATCH /api/ai/consent` updates it. The default blocks selected text, paragraph/page context, and notes until the user opts in. `GET /api/ai/budget` returns daily request/token usage, max prompt size, and circuit-breaker state.

**Full setup guide with architecture diagrams:** See [GOOGLE_AI_SETUP.md](GOOGLE_AI_SETUP.md).

For production, set `APP_ENV=production` and explicit `FRONTEND_ORIGINS`. Do not use wildcard CORS.

## OCR (Scanned PDFs)

The backend uses Tesseract OCR with OpenCV preprocessing to extract text from scanned PDFs. The PDF service first tries native PDF text extraction page by page. If a PDF page has no usable text layer, it falls back to OCR and stores page text separated by form-feed (`\f`). The reader uses that OCR text as an invisible PDF mask layer so scanned pages can still be selected, analyzed, and looked up in the dictionary.

Relevant flow:

```text
POST /api/documents/upload
-> save uploaded file under backend/data/uploads
-> extract_file_text(...)
   -> native PDF text via pypdf, joined by \f
   -> OCR fallback via pdf2image + Tesseract if native text is empty
-> persist document.content
-> persist one PageRecord per form-feed page

Reader opens PDF
-> PDF.js renders page canvas
-> native PDF text layer if available
-> if native text layer is empty, use document.content page text as invisible OCR mask
-> user selection goes to /api/nlp/analyze and dictionary lookup
```

Runtime refresh endpoint:

```http
POST /api/documents/{document_id}/ocr
```

Use this when a stored PDF exists but `documents.content` is empty or OCR dependencies were installed after the original upload. The endpoint validates that the stored file path remains under `UPLOAD_DIR`, re-extracts text, replaces document content, replaces page records, and returns:

```json
{
  "document_id": "...",
  "status": "ocr_ready",
  "content": "page 1 text\\fpage 2 text",
  "page_count": 2
}
```

System requirements for native host installs:
- **Tesseract OCR** with `chi_sim` (Simplified Chinese) language data
- **Poppler** (for pdf2image to convert PDF pages to images)

Docker installs these system packages automatically through `backend/Dockerfile`.

Configure via environment variables if not on PATH:

```text
TESSERACT_CMD=/usr/bin/tesseract
POPPLER_PATH=/usr/bin
```

Common OCR failures:

```text
TesseractNotFoundError
-> Install Tesseract or set TESSERACT_CMD.

PDFInfoNotInstalledError / Unable to get page count
-> Install Poppler or set POPPLER_PATH to the Poppler bin folder.

OCR returns empty text
-> Check scan quality, page rotation, watermark noise, and installed Chinese language data.
```

## Migrations

```bash
python -m alembic upgrade head
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

The release repository includes importable raw dictionary data under `data/raw/`:

```text
data/raw/cedict/cedict_ts.u8
data/raw/hsk/*.csv
data/raw/phrase/*.csv
data/raw/TrungViet/TrungViet/star_trungviet.*
```

`python backend/scripts/bootstrap_data.py` prefers those in-repo paths, so a fresh clone can rebuild CC-CEDICT, HSK vocabulary, phrase entries, and Trung-Việt enrichment without depending on `D:\exe\...` or any other local source folder.

Bootstrap behavior:

```text
1. Import CC-CEDICT if dictionary table has no cc_cedict rows, or when --force is used.
2. Import HSK CSVs if HSK source rows are missing, or when --force is used.
3. Parse StarDict Trung-Việt if data/raw/TrungViet/... exists.
4. Enrich existing entries whose Vietnamese definitions are missing.
5. Import phrase CSVs as phrase_entries when missing, or when --force is used.
```

Do not use `git add .` blindly after local test runs. If `backend/data/hanora.sqlite3` changed only because e2e/reset-demo/upload ran, leave it unstaged unless the release explicitly updates the demo DB. Always stage the raw source data:

```bash
git add data/raw .gitattributes backend/scripts/bootstrap_data.py
```

## Operations

Deep health and sanitized config:

```bash
curl http://127.0.0.1:3001/api/health/deep
curl http://127.0.0.1:3001/api/system/config
```

Local backup/export:

```bash
python backend/scripts/backup_database.py
python backend/scripts/restore_database.py hanora_YYYYMMDDTHHMMSSZ.sqlite3
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
python -m pytest backend/tests
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
PDF page splitting and OCR refresh persistence
document translation/vocabulary automation
upload type/size safety
admin backup/export without secret leakage
Google AI key rotation without secret leakage
AI consent blocking and context sanitization
AI daily budget/circuit breaker blocking
```
