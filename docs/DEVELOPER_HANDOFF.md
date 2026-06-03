# Hanora Developer Handoff

Tài liệu này dành cho dev trong team khi nhận branch release, clone repo mới, debug OCR/PDF scan, import từ điển, hoặc chuẩn bị push lên `main`.

## Release Invariants

Các điểm này không được phá khi sửa Reader/OCR/dictionary:

```text
1. Dev clone repo mới phải build và chạy được.
2. Raw translation data phải nằm trong repository dưới data/raw/.
3. Không phụ thuộc vào D:\exe\des, D:\exe\... hoặc thư mục cá nhân của một dev.
4. PDF scan phải có đường OCR -> page text -> invisible mask -> selection -> dictionary lookup.
5. Sentence, paragraph, context translation phải tách biệt trong UI/API.
6. AI chat là floating bubble trong Reader, không quay lại sidebar/tab cố định.
7. backend/data/hanora.sqlite3 không phải nguồn duy nhất của dữ liệu dịch thuật.
```

## Current Page Map

Primary app pages:

```text
/dashboard    Dashboard, upload/loading file, local workspace overview
/reader       Main Reader, PDF/text reading, dictionary lookup, AI bubble, saved reader hub
/vocabulary   Dedicated vocabulary page
/flashcards   SRS review queue
/store        Packs/store page
/settings     App/AI/privacy configuration
```

Reader internal views:

```text
Đọc tài liệu       current document/PDF/text reader
Lưu trong reader   saved vocabulary and annotations from Reader
Ôn trong reader    reader-local flashcard/study hub
```

Do not write e2e tests against older Dashboard tab names or the old fixed AI sidebar. Current UI uses nav links, dashboard side buttons, Reader subview buttons, and the floating chat widget.

## Fresh Clone Setup

Recommended fast path:

```bash
npm run setup
npm run dev
```

Manual path:

```bash
cp .env.example .env
cp backend/.env.example backend/.env

npm install
python -m pip install -r backend/requirements.txt
npx playwright install chromium

python -m alembic upgrade head
python backend/scripts/bootstrap_data.py

npm run dev
```

Docker path for consistent OCR dependencies:

```bash
docker compose up --build
```

Use Docker when the teammate has not installed Tesseract/Poppler locally.

## Raw Dictionary Data

Required release data:

```text
data/raw/cedict/cedict_ts.u8
data/raw/hsk/Zhongwen Kaoshi - HSK 1 Words.csv
data/raw/hsk/Zhongwen Kaoshi - HSK 2 Words.csv
data/raw/hsk/Zhongwen Kaoshi - HSK 3 Words.csv
data/raw/hsk/Zhongwen Kaoshi - HSK 4 Words.csv
data/raw/hsk/Zhongwen Kaoshi - HSK 6 Words.csv
data/raw/hsk/Zhongwen Kaoshi - HSK 7-9 Words.csv
data/raw/hsk/Zhongwen Shangwu Yongyu - Business Chinese 1.csv
data/raw/hsk/Zhongwen Shangwu Yongyu - Business Chinese 2.csv
data/raw/phrase/Ultimate Chinese Word List (Part A).csv
data/raw/phrase/Ultimate Chinese Word List (Part B).csv
data/raw/phrase/Ultimate Chinese Word List (Part C).csv
data/raw/phrase/Ultimate Chinese Word List (Part D).csv
data/raw/phrase/Ultimate Chinese Word List (Part E).csv
data/raw/phrase/Ultimate Chinese Word List (Part F).csv
data/raw/TrungViet/TrungViet/star_trungviet.dict
data/raw/TrungViet/TrungViet/star_trungviet.idx
data/raw/TrungViet/TrungViet/star_trungviet.ifo
```

`bootstrap_data.py` looks for these paths first. If a dev moves or deletes `data/raw`, fresh clone bootstrap will silently lose Vietnamese dictionary quality.

StarDict binary protection:

```bash
git check-attr -a -- data/raw/TrungViet/TrungViet/star_trungviet.dict data/raw/TrungViet/TrungViet/star_trungviet.idx
```

Expected:

```text
binary: set
text: unset
```

If this is not true, `.gitattributes` is missing or not staged.

## Bootstrap Data Behavior

Run:

```bash
python backend/scripts/bootstrap_data.py
```

The script:

```text
1. Imports CC-CEDICT from data/raw/cedict/cedict_ts.u8 when missing.
2. Imports HSK CSVs from data/raw/hsk when missing.
3. Parses Trung-Việt StarDict files from data/raw/TrungViet/TrungViet.
4. Enriches existing dictionary rows with Vietnamese definitions.
5. Imports phrase CSVs from data/raw/phrase when phrase entries are missing.
```

Use `--force` only when intentionally rebuilding/importing over an existing local DB:

```bash
python backend/scripts/bootstrap_data.py --force
```

Do not use a teammate's local path as the default importer path. Local paths are acceptable only as one-off CLI arguments during private experiments.

## PDF Scan And OCR Flow

Upload flow:

```text
POST /api/documents/upload
-> save file
-> extract PDF native text page by page
-> OCR fallback if native text is empty
-> join pages with \f
-> save document.content
-> recreate PageRecord rows
```

Refresh flow for an existing stored PDF:

```http
POST /api/documents/{document_id}/ocr
```

Reader flow:

```text
PDF.js renders canvas
-> PDF.js native text layer if available
-> OCR text mask if native text is empty
-> [data-page-text] stores text for selection/context
-> selection creates bbox ratio + source sentence + page context
-> /api/nlp/analyze
-> dictionary fallback / contextual translation / save / quiz
```

Important frontend files:

```text
src/features/reader/components/PdfDocumentViewer.tsx
src/features/reader/pdfMask.ts
src/features/reader/ReaderPage.tsx
src/features/reader/components/ReaderSidebar.tsx
src/features/reader/components/ChatPanel.tsx
```

Important backend files:

```text
backend/services/pdf_service.py
backend/ocr_service.py
backend/routers/documents.py
backend/services/nlp_service.py
```

## Native OCR Requirements

Python packages are in `backend/requirements.txt`, but native binaries are still required outside Docker:

```text
Tesseract OCR
Tesseract language data: chi_sim, ideally chi_tra
Poppler utilities
```

Windows `.env` example:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\Library\bin
```

Linux/macOS usually works with:

```env
TESSERACT_CMD=tesseract
POPPLER_PATH=
```

See `docs/ocr_setup.md` for install commands and error handling.

## Translation Scope Rules

Do not collapse these into one output:

```text
Word/phrase dictionary lookup    /api/nlp/analyze
Sentence translation             /api/nlp/translate-context scope=sentence
Paragraph translation            /api/nlp/translate-context scope=paragraph
Context role/explanation         /api/nlp/translate-context scope=context
Optional AI chat                 /api/ai/chat
```

When AI is unavailable, UI must show dictionary fallback clearly:

```text
Đang dùng bản dịch từ điển cục bộ, chưa phải bản dịch tự nhiên.
```

This prevents users from mistaking token-by-token fallback for natural Vietnamese translation.

## AI Chat Rules

Current design:

```text
Reader bottom-right floating button
-> floating chat panel
-> AI status/consent checklist when empty
-> /api/ai/chat for questions
```

Do not put chat back into the NLP sidebar. The sidebar remains for Dict/Pinyin/AI analysis/Quiz, while chat is a floating assistant.

## SRS Flashcard Rule

The `/flashcards` review queue should show only due or unreviewed cards. After a user rates the only due card as Easy/Good/Hard/Again, the queue state must update and should not immediately fall back to the full deck.

Relevant file:

```text
src/features/review/FlashCardsPage.tsx
```

## Test And Verification Gate

Use D-drive temp on low-space Windows machines:

```powershell
$env:TEMP='D:\exe\final\.tmp'
$env:TMP='D:\exe\final\.tmp'
$env:NODE_OPTIONS='--max-old-space-size=4096'
```

Recommended release gate:

```bash
npm run build
npm run test:frontend
npm run test:backend
npm run test:e2e
npm run security:check
npm run docs:check
```

`npm run test:e2e` uses `scripts/e2e.mjs`. That runner:

```text
sets TEMP/TMP to .tmp inside the repo
sets NODE_OPTIONS=--max-old-space-size=4096 when missing
builds the frontend first
runs Playwright with --workers=1
uses E2E_FRONTEND_PORT=3000 by default to match backend CORS/dev origins
stops any existing listener on the frontend e2e port before starting preview
```

If you need a custom preview port:

```bash
E2E_FRONTEND_PORT=3910 npm run test:e2e
```

When using a custom port, make sure backend CORS allows that origin. For the default release gate, keep port `3000`.

If you intentionally want to reuse an existing preview server:

```bash
E2E_SKIP_PORT_CLEANUP=1 npm run test:e2e
```

Current e2e coverage expects:

```text
PDF upload and selection
dictionary fallback warning
context translation endpoint
floating AI chat
highlight annotation persistence
flashcard SRS progression
quiz generation
dashboard/vocabulary mapping
```

If Playwright flakes on PDF text selection, use `selectTextInPdfPage(...)` from `tests/e2e/test-utils.ts`; it waits until `[data-page-text]` contains the target phrase before creating a browser selection.

## Git Staging Rules

Do not run `git add .` without checking status.

Release files that must be staged when this feature changes:

```bash
git add .gitattributes
git add data/raw
git add backend/README.md README.md docs
git add backend/ocr_service.py backend/services/pdf_service.py backend/routers/documents.py
git add backend/scripts/bootstrap_data.py backend/services/nlp_service.py
git add backend/requirements.txt backend/requirements-ocr.txt
git add src/features/reader src/features/review src/store/slices/types.ts
git add backend/tests tests/e2e src/tests scripts/security_check.py
```

Usually do not stage:

```text
backend/data/hanora.sqlite3
backend/data/uploads/
backend/data/backups/
.tmp/
test-results/
playwright-report/
```

`backend/data/hanora.sqlite3` can change after e2e because tests reset demo data and upload PDFs. Stage it only when the release explicitly updates the demo DB, and document that decision in the PR.

## Troubleshooting Matrix

PDF page renders but no selectable text:

```text
Check [data-page-text] on the PDF page element.
Check document.content in backend response.
Call POST /api/documents/{id}/ocr.
Verify Tesseract/Poppler.
```

OCR endpoint returns empty content:

```text
Check scan quality and language data.
Run tesseract --list-langs and confirm chi_sim.
Check POPPLER_PATH.
Try Docker to remove native host variance.
```

Dictionary returns placeholder/missing Vietnamese:

```text
Confirm data/raw exists.
Run python backend/scripts/bootstrap_data.py.
Check StarDict .dict/.idx are binary through git check-attr.
Check backend/data/hanora.sqlite3 was not assumed as canonical after reset-demo.
```

AI chat says context endpoint cannot be called:

```text
Check backend is running on 127.0.0.1:3001.
Check /api/ai/status and /api/ai/consent.
Confirm frontend VITE_API_BASE_URL points to http://127.0.0.1:3001/api.
Remember AI is optional; dictionary fallback must still work.
```

E2E cannot click dashboard side buttons:

```text
Onboarding overlay may be visible.
Call completeOnboardingIfVisible(page) before dashboard side navigation assertions.
```

Security check fails on raw data:

```text
scripts/security_check.py streams large files in chunks.
If a new binary/raw file is added, avoid whole-file reads.
Do not skip raw data entirely; scan it safely.
```
