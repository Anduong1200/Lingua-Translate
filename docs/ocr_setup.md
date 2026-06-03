# OCR Setup And PDF Masking

Hanora supports scanned PDF reading through backend OCR plus a frontend PDF text mask. This is no longer only a roadmap item.

## What Happens At Runtime

```text
Upload PDF
-> backend saves the original PDF in backend/data/uploads
-> backend extracts native PDF page text first
-> if no native text is found, backend renders pages to images and runs Tesseract OCR
-> document.content is saved with page separators as form-feed: \f
-> PageRecord rows are recreated one row per page
-> Reader renders the PDF canvas with PDF.js
-> if PDF.js text layer is empty, Reader overlays invisible selectable OCR text
-> user can highlight text, analyze, translate, save, and create review items
```

The invisible mask is intentionally separate from the PDF image. It does not modify the PDF file. It gives the browser selectable text so dictionary lookup can work on scanned pages.

## Required Native Tools

Docker installs these automatically. Native host installs must provide them.

Required:

```text
Tesseract OCR
Tesseract Chinese language data: chi_sim, ideally chi_tra too
Poppler utilities
```

Python packages are included in `backend/requirements.txt`:

```text
pytesseract
pdf2image
Pillow
opencv-python-headless
numpy
```

## Docker Path

From repository root:

```bash
docker compose up --build
```

The backend Dockerfile installs:

```text
tesseract-ocr
tesseract-ocr-chi-sim
tesseract-ocr-chi-tra
poppler-utils
libgl1
libglib2.0-0
```

Use Docker when a teammate should be able to run the same OCR stack without manual Windows setup.

## Windows Native Setup

Install Tesseract and Poppler, then set paths in `backend/.env`.

Example:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
POPPLER_PATH=C:\poppler\Library\bin
```

Then restart backend:

```powershell
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 3001 --reload
```

Quick checks:

```powershell
& "C:\Program Files\Tesseract-OCR\tesseract.exe" --list-langs
Get-ChildItem "C:\poppler\Library\bin\pdfinfo.exe"
```

`--list-langs` must include `chi_sim` for simplified Chinese scanned PDFs.

## Linux Native Setup

Debian/Ubuntu:

```bash
sudo apt-get update
sudo apt-get install -y tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-chi-tra poppler-utils
python -m pip install -r backend/requirements.txt
```

Then use defaults:

```env
TESSERACT_CMD=tesseract
POPPLER_PATH=
```

## macOS Native Setup

```bash
brew install tesseract tesseract-lang poppler
python -m pip install -r backend/requirements.txt
```

If binaries are not on PATH, set:

```env
TESSERACT_CMD=/opt/homebrew/bin/tesseract
POPPLER_PATH=/opt/homebrew/bin
```

## Refreshing OCR For An Existing Document

If a PDF was uploaded before OCR dependencies were installed, call:

```bash
curl -X POST http://127.0.0.1:3001/api/documents/<document_id>/ocr
```

Expected successful response:

```json
{
  "document_id": "<document_id>",
  "status": "ocr_ready",
  "content": "page 1 text\\fpage 2 text",
  "page_count": 2
}
```

In the Reader UI, scanned PDFs with empty content trigger this refresh automatically once per document in the current session.

## Troubleshooting

`TesseractNotFoundError`

Tesseract is missing or `TESSERACT_CMD` is wrong. Install Tesseract or set `TESSERACT_CMD` to the executable.

`PDFInfoNotInstalledError` or `Unable to get page count`

Poppler is missing or `POPPLER_PATH` is wrong. Install Poppler and set `POPPLER_PATH` to the folder containing `pdfinfo` and `pdftoppm`.

OCR returns empty text

Check:

```text
scan resolution
page rotation
watermark/noise
whether chi_sim is installed
whether the PDF is password protected
```

Native text layer exists but selection is wrong

The Reader prefers native PDF.js text when available. If the source PDF has a bad embedded text layer, re-OCR the PDF externally or remove the bad text layer before upload. The OCR mask is used only when the native text layer is empty.

Tests fail with empty PDF text layer

E2E uses `tests/e2e/test-utils.ts` to wait until `[data-page-text]` or text content contains the target phrase. If a new test selects text, use `selectTextInPdfPage(...)` instead of reading immediately after upload.
