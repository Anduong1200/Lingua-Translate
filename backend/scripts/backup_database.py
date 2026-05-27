from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import create_database_backup


def main() -> None:
    print(create_database_backup())


if __name__ == "__main__":
    main()
