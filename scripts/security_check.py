from __future__ import annotations

import re
import sys
from pathlib import Path


SECRET_PATTERNS = {
    "google_api_key": re.compile(r"AIza[0-9A-Za-z_-]{20,}"),
    "generic_private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
}

SKIP_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "release",
    "test-results",
    "playwright-report",
    "backend/data",
    "__pycache__",
}

SKIP_FILES = {
    "package-lock.json",
}


def should_skip(path: Path) -> bool:
    normalized = path.as_posix()
    if path.name.startswith(".env") and path.name != ".env.example":
        return True
    if path.name in SKIP_FILES:
        return True
    for skip_dir in SKIP_DIRS:
        if normalized == skip_dir or normalized.startswith(f"{skip_dir}/") or skip_dir in path.parts:
            return True
    return False


def text_contains(pattern: re.Pattern[str], path: Path) -> bool:
    carry = ""
    try:
        with path.open("rb") as handle:
            while True:
                chunk = handle.read(1024 * 1024)
                if not chunk:
                    break
                text = carry + chunk.decode("utf-8", errors="ignore")
                if pattern.search(text):
                    return True
                carry = text[-128:]
    except OSError:
        return False
    return False


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    findings: list[str] = []

    for path in root.rglob("*"):
        if not path.is_file():
            continue
        relative_path = path.relative_to(root)
        if should_skip(relative_path):
            continue
        for name, pattern in SECRET_PATTERNS.items():
            if text_contains(pattern, path):
                findings.append(f"{name}: {relative_path.as_posix()}")

    if findings:
        print("Potential secrets found:")
        for finding in findings:
            print(f" - {finding}")
        return 1

    print("Security check passed: no obvious secrets detected.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
