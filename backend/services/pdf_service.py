from __future__ import annotations

from io import BytesIO
from fastapi import HTTPException

try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

try:
    import docx
except Exception:
    docx = None


def extract_file_text(file_name: str, data: bytes) -> str:
    lower_name = file_name.lower()
    if lower_name.endswith((".png", ".jpg", ".jpeg", ".webp")):
        try:
            from ocr_service import ocr_chinese_image_bytes
            return ocr_chinese_image_bytes(data)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Image OCR failed: {exc}") from exc
    if lower_name.endswith(".pdf"):
        if PdfReader is None:
            raise HTTPException(status_code=500, detail="pypdf is not installed.")
        reader = PdfReader(BytesIO(data))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        if not text.strip():
            # Fallback to OCR if text is empty (scanned PDF)
            try:
                from ocr_service import ocr_chinese_pdf_bytes
                text = ocr_chinese_pdf_bytes(data)
            except Exception as e:
                print(f"OCR fallback failed: {e}")
        return text
    if lower_name.endswith(".docx"):
        if docx is None:
            raise HTTPException(status_code=500, detail="python-docx is not installed.")
        document = docx.Document(BytesIO(data))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)
    return data.decode("utf-8", errors="ignore")
