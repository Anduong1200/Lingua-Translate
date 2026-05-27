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
backend/data/google_api_keys.txt
```

## Environment

Copy:

```bash
copy backend\.env.example backend\.env
```

Supported variables:

```text
GOOGLE_API_KEYS=key1,key2,key3
GOOGLE_AI_MODEL=gemini-3.5-flash
```

Multiple keys are rotated round-robin. API responses expose only key index and fingerprint.

## Import Data

```bash
python backend\scripts\import_cc_cedict.py path\to\cedict_ts.u8
python backend\scripts\import_hsk_vocab.py path\to\hsk_folder
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
Google AI key rotation without secret leakage
```
