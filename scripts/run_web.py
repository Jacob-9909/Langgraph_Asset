"""Wealth Advisor Web UI 실행.

Usage:
    uv run python scripts/run_web.py            # HTTP  → http://localhost:8000
    uv run python scripts/run_web.py --https    # HTTPS → https://localhost:8443
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import uvicorn

from wealth_advisor.api.app import app  # noqa: F401

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--https", action="store_true", help="Enable HTTPS with self-signed cert")
    parser.add_argument("--port", type=int, default=None)
    args = parser.parse_args()

    common = dict(host="0.0.0.0", reload=True, reload_dirs=["src"])

    if args.https:
        from wealth_advisor.api.certs import ensure_certs

        cert, key = ensure_certs()
        port = args.port or 8443
        print(f"\n  HTTPS → https://localhost:{port}\n")
        uvicorn.run(
            "wealth_advisor.api.app:app",
            port=port,
            ssl_certfile=cert,
            ssl_keyfile=key,
            **common,
        )
    else:
        port = args.port or 8000
        print(f"\n  HTTP → http://localhost:{port}\n")
        uvicorn.run("wealth_advisor.api.app:app", port=port, **common)
