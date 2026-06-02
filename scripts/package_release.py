from __future__ import annotations

import argparse
import fnmatch
import os
import shutil
import zipfile
from pathlib import Path


DEFAULT_ARTIFACT = Path("release") / "hanora-mvp-source.zip"

EXCLUDED_DIRS = {
    ".git",
    ".antigravitycli",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "dist-ssr",
    "test-results",
    "playwright-report",
    "blob-report",
    "__pycache__",
    "scratch",
}

EXCLUDED_PATTERNS = {
    ".env",
    ".env.*",
    "backend/.env",
    "backend/.env.*",
    "backend/data/**",
    "backend/uploads/**",
    "*.sqlite",
    "*.sqlite3",
    "*.db",
    "*.pyc",
    "*.pyo",
    "*.zip",
}

ALLOWED_ENV_EXAMPLES = {".env.example", "backend/.env.example"}


def normalized(path: Path) -> str:
    return path.as_posix()


def should_exclude(relative_path: Path) -> bool:
    parts = set(relative_path.parts)
    if parts & EXCLUDED_DIRS:
        return True

    normalized_path = normalized(relative_path)
    if normalized_path in ALLOWED_ENV_EXAMPLES:
        return False

    return any(fnmatch.fnmatch(normalized_path, pattern) for pattern in EXCLUDED_PATTERNS)


def iter_release_files(root: Path, artifact: Path) -> list[Path]:
    files: list[Path] = []
    artifact = artifact.resolve()
    for path in root.rglob("*"):
        if path.is_symlink():
            continue
        if not path.is_file():
            continue
        if path.resolve() == artifact:
            continue
        relative_path = path.relative_to(root)
        if should_exclude(relative_path):
            continue
        files.append(relative_path)
    return sorted(files, key=lambda item: item.as_posix())


def create_release_zip(root: Path, artifact: Path) -> None:
    artifact = artifact.resolve()
    release_dir = artifact.parent
    default_release_dir = (root / "release").resolve()
    if release_dir == default_release_dir:
        if release_dir.exists():
            shutil.rmtree(release_dir)
        release_dir.mkdir(parents=True, exist_ok=True)
    else:
        release_dir.mkdir(parents=True, exist_ok=True)
        if artifact.exists():
            artifact.unlink()

    files = iter_release_files(root, artifact)
    with zipfile.ZipFile(artifact, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for relative_path in files:
            archive.write(root / relative_path, arcname=relative_path.as_posix())

    with zipfile.ZipFile(artifact) as archive:
        invalid_paths = [name for name in archive.namelist() if "\\" in name]
        if invalid_paths:
            raise RuntimeError(f"Zip contains non-portable paths: {invalid_paths[:3]}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a clean Hanora source release artifact.")
    parser.add_argument("--output", type=Path, default=DEFAULT_ARTIFACT, help="Output zip path.")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output = args.output
    if not output.is_absolute():
        output = root / output

    create_release_zip(root, output)
    print(f"Created clean release artifact: {os.fspath(output)}")


if __name__ == "__main__":
    main()
