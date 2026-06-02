from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"

MARKDOWN_IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*\bsrc=[\"']([^\"']+)[\"']", re.IGNORECASE)


def is_local_reference(value: str) -> bool:
    target = value.strip().split()[0].strip("\"'")
    parsed = urlparse(target)
    return not parsed.scheme and not target.startswith("#")


def normalize_reference(value: str) -> Path:
    target = value.strip().split()[0].strip("\"'")
    return (ROOT / target).resolve()


def main() -> None:
    if not README.exists():
        raise SystemExit("README.md is missing.")

    text = README.read_text(encoding="utf-8")
    references = MARKDOWN_IMAGE_RE.findall(text) + HTML_IMAGE_RE.findall(text)
    missing = []
    for reference in references:
        if not is_local_reference(reference):
            continue
        target = normalize_reference(reference)
        try:
            target.relative_to(ROOT)
        except ValueError:
            missing.append(reference)
            continue
        if not target.exists():
            missing.append(reference)

    if missing:
        print("README has missing local image assets:", file=sys.stderr)
        for reference in missing:
            print(f"- {reference}", file=sys.stderr)
        raise SystemExit(1)

    print("README asset check passed.")


if __name__ == "__main__":
    main()
