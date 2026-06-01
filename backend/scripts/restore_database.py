from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routers.admin import restore_database_backup


def main() -> None:
    parser = argparse.ArgumentParser(description="Restore Hanora SQLite from a backup in backend/data/backups.")
    parser.add_argument("file_name", help="Backup file name, for example hanora_20260527T120000Z.sqlite3.")
    args = parser.parse_args()
    print(restore_database_backup(args.file_name))


if __name__ == "__main__":
    main()
