"""Wealth Advisor CLI 실행.

Usage:
    uv run python scripts/run_advisor.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from wealth_advisor.cli import main

if __name__ == "__main__":
    main()
