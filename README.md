# Hanora

Offline-first Chinese context reader for Vietnamese learners.

Core MVP flow:

```text
PDF -> Text Layer -> Selection -> NLP Analyze -> Dictionary Lookup -> Context/Grammar Panel -> Annotation/Review
```

The app keeps learning data in local SQLite. Cloud AI is optional and only used as an explanation layer when enabled.

## Current Scope

Implemented:

- React + Vite + TypeScript frontend
- PDF.js text-layer reader
- FastAPI backend on `127.0.0.1:3001`
- SQLite source of truth in `backend/data/hanora.sqlite3`
- jieba segmentation and pypinyin
- CC-CEDICT import pipeline
- HSK 1-9 PDF vocabulary import pipeline
- Vietnamese custom dictionary and user corrections
- Contextual NLP analyze endpoint
- Annotation persistence with PDF overlay metadata
- Review item and simple SRS scheduler
- User profile/settings sync
- Optional Google Gemini context-reading API with rotating keys
- Production hardening basics: explicit CORS config, upload/rate limits, deep health, backup/restore/export APIs, Alembic migrations, Docker Compose, and CI build/test workflow
- OCR for scanned PDFs (integrated with OpenCV preprocessing and Tesseract OCR fallback)
- Local full-document translation endpoint for side-by-side reading
- Automatic vocabulary scan and flashcard creation from imported documents

## Not in Production v1.0 / Next Steps:

- Full-document AI translation beyond the local rule-based layer
- Login/auth with a real identity provider
- Remote sync with a real backend service
- Payment / SaaS features
- FSRS tuning (Free Spaced Repetition Scheduler)

## Stack

Frontend:

- React
- Vite
- TypeScript
- Tailwind CSS
- PDF.js / `pdfjs-dist`
- Zustand

Backend:

- Python
- FastAPI
- Pydantic
- Uvicorn
- SQLAlchemy
- SQLite
- Alembic
- jieba
- pypinyin
- httpx

Data:

- CC-CEDICT
- HSK vocabulary PDFs
- Custom Vietnamese dictionary
- User corrections

## Repository Layout

```text
.
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── README.md
│   ├── alembic.ini
│   ├── alembic/
│   ├── scripts/
│   └── tests/
├── public/
├── src/
│   ├── components/layout/
│   ├── lib/
│   ├── pages/
│   ├── store/
│   └── types/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

Runtime files are ignored:

```text
backend/data/
backend/.env
dist/
node_modules/
test-results/
playwright-report/
```

## System Requirements (OCR)

For processing scanned PDFs and images, the backend requires:
1. **Tesseract OCR**: Needs to be installed on the system (with `chi_sim` and `chi_tra` language data).
2. **Poppler**: Required for `pdf2image` to extract images from PDFs.

On Windows, ensure both are added to your `PATH`, or configure them via environment variables below.

## Setup

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
python -m pip install -r backend/requirements.txt
```

Copy optional environment template:

```bash
copy backend\.env.example backend\.env
```

Recommended backend production-oriented defaults:

```text
APP_ENV=development
FRONTEND_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
ALLOWED_UPLOAD_EXTENSIONS=.pdf,.txt,.md,.docx
MAX_UPLOAD_BYTES=52428800
UPLOAD_RATE_LIMIT_PER_MINUTE=20
AI_RATE_LIMIT_PER_MINUTE=30
GOOGLE_API_KEYS=
GOOGLE_AI_MODEL=gemini-3.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
TESSERACT_CMD=tesseract
POPPLER_PATH=
```

For frontend API override, create `.env` if needed:

```text
VITE_API_BASE_URL=http://127.0.0.1:3001/api
```

## Run

Terminal 1:

```bash
npm run backend
```

Terminal 2:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

Docker Compose local production build:

```bash
npm run docker:up
```

Optional AI keys for Compose:

```bash
set GOOGLE_API_KEYS=GOOGLE_KEY_1,GOOGLE_KEY_2
npm run docker:up
```

This starts:

```text
frontend: http://127.0.0.1:3000
backend:  http://127.0.0.1:3001
data:     ./backend/data
```

Backend health:

```text
http://127.0.0.1:3001/api/health
http://127.0.0.1:3001/api/health/deep
```

Apply migrations on a clean database:

```bash
npm run db:migrate
```

## Import Dictionary Data

Import CC-CEDICT:

```bash
python backend\scripts\import_cc_cedict.py D:\exe\cedict_1_0_ts_utf-8_mdbg_20260525_061910\cedict_ts.u8
```

Import HSK vocabulary PDFs:

```bash
python backend\scripts\import_hsk_vocab.py D:\exe\hsk
```

Or run the bootstrap helper, which auto-detects the local `D:\exe` data layout when available:

```bash
python backend\scripts\bootstrap_data.py
```

Explicit paths:

```bash
python backend\scripts\bootstrap_data.py --cedict path\to\cedict_ts.u8 --hsk path\to\hsk_folder
```

Current local imported counts:

```text
CC-CEDICT: 124,954
HSK vocab: 11,041
Total dictionary entries including seeds: 136,024
```

Check database stats:

```bash
curl http://127.0.0.1:3001/api/debug/db-stats
```

## Optional Google AI Context Reading

AI is optional. The app remains usable without internet/API keys.

Supported config:

```text
GOOGLE_API_KEYS=key1,key2,key3
GOOGLE_AI_MODEL=gemini-3.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
```

You can also add keys manually in:

```text
backend/data/google_api_keys.txt
```

One key per line is supported. The backend rotates keys round-robin and never returns raw keys in API responses.

AI endpoints:

```text
GET  /api/ai/status
POST /api/ai/context-reading
POST /api/nlp/analyze with {"ai_enabled": true}
```

AI is used only as a context/explanation layer. Dictionary, pinyin, segmentation, annotations, review items, and dashboard still work locally.

## Core API

System:

```text
GET /api/health
GET /api/health/deep
GET /api/system/info
GET /api/system/config
GET /api/ai/status
```

NLP and dictionary:

```text
POST /api/nlp/analyze
POST /api/nlp/segment
POST /api/nlp/pinyin
GET  /api/dictionary/search?q=处理
POST /api/dictionary/custom
POST /api/dictionary/import
```

Documents:

```text
POST /api/documents/upload
GET  /api/documents
GET  /api/documents/{document_id}
GET  /api/documents/{document_id}/file
GET  /api/documents/{document_id}/translate
GET  /api/documents/{document_id}/vocabulary-scan
POST /api/documents/{document_id}/auto-review-items
POST /api/documents/{document_id}/pages
```

Annotations and review:

```text
POST   /api/annotations
GET    /api/annotations
PATCH  /api/annotations/{annotation_id}
DELETE /api/annotations/{annotation_id}

POST /api/review-items
GET  /api/review-items
GET  /api/review-items/due
POST /api/review-events
```

Personalization:

```text
GET   /api/user/profile
PATCH /api/user/profile
GET   /api/user/corrections
POST  /api/user/corrections
GET   /api/known-words
POST  /api/known-words
```

Dashboard:

```text
GET /api/dashboard/summary
GET /api/dashboard/hsk-distribution
GET /api/dashboard/domain-distribution
```

Admin/operations:

```text
POST /api/admin/backup
GET  /api/admin/backups
POST /api/admin/restore
GET  /api/admin/export
```

Create a local SQLite backup from the terminal:

```bash
npm run backend:backup
npm run backend:restore -- hanora_YYYYMMDDTHHMMSSZ.sqlite3
```

Restore only accepts backup file names from `backend/data/backups`; path traversal and arbitrary DB paths are rejected.

## Verify

Run backend tests:

```bash
npm run test:backend
```

Build frontend:

```bash
npm run build
```

Run both:

```bash
npm run verify
```

CI runs backend tests and frontend build on pushes/PRs to `main`.

Optional browser golden path:

```bash
npx playwright install chromium
npm run test:e2e
```

Known warning:

```text
Vite may warn that the PDF worker chunk is larger than 500 kB.
```

This is expected for PDF.js and does not block MVP 0.1.

## MVP Acceptance Criteria

The project should pass:

```text
1. Import PDF
2. Refresh app and reopen the same PDF from backend file storage
3. Select text -> analyze -> dictionary lookup
4. Save annotation
5. Reload -> annotation metadata still comes from backend
6. Add to review
7. Review queue loads from backend
8. Submit review -> due_at changes
9. Dashboard data comes from SQLite-backed state
10. User correction takes priority in later lookup/analyze
```

## Security Notes

Do not commit:

```text
backend/.env
backend/data/
backend/data/google_api_keys.txt
```

If an API key was pasted into chat or committed by mistake, rotate it in Google Cloud before using the app seriously.
