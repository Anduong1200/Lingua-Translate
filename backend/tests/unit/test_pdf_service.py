from __future__ import annotations

from services import pdf_service


class FakePage:
    def __init__(self, text: str) -> None:
        self.text = text

    def extract_text(self) -> str:
        return self.text


class FakePdfReader:
    def __init__(self, _buffer) -> None:
        self.pages = [
            FakePage("第一页 市场需求"),
            FakePage("第二页 计算机系统"),
        ]


def test_pdf_text_extraction_preserves_page_boundaries(monkeypatch) -> None:
    monkeypatch.setattr(pdf_service, "PdfReader", FakePdfReader)

    text = pdf_service.extract_file_text("sample.pdf", b"%PDF-test")

    assert text == "第一页 市场需求\f第二页 计算机系统"
