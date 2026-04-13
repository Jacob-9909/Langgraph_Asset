"""Wealth Advisor Web UI 실행.

Usage:
    uv run python examples/run_web.py
    # → http://localhost:8000
"""

import sys
from pathlib import Path

# examples/ 상위를 path에 추가 (langgraph_bootstrap import)
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import uvicorn

from wealth_advisor.web.app import app  # noqa: E402, F401

if __name__ == "__main__":
    uvicorn.run(
        "wealth_advisor.web.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(Path(__file__).resolve().parent)],
    )
