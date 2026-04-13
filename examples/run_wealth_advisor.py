"""
Wealth Advisor — 멀티 에이전트: 유저 정보 기반 예·적금·자산 관리 정책 추천 (웹 검색 + HITL)

구현은 `examples/wealth_advisor/` 패키지로 분리됨:
  - `nodes/` — profile, product/news/tax 리서치, advisor
  - `tools/` — 네이버, Tavily, 국세청 법령해석(상세 본문은 optional `uv sync --extra nts-law-detail` + `playwright install chromium`)
  - `graph.py` — StateGraph 조립
  - `cli.py` — 터미널·체크포인터

실행 (프로젝트 루트에서):
  uv run python examples/run_wealth_advisor.py

또는 `examples/` 에서:
  uv run python -m wealth_advisor
"""

from __future__ import annotations

import sys
from pathlib import Path

_EXAMPLES = Path(__file__).resolve().parent
if str(_EXAMPLES) not in sys.path:
    sys.path.insert(0, str(_EXAMPLES))

import _project_root  # noqa: F401, E402

from wealth_advisor.cli import main  # noqa: E402

if __name__ == "__main__":
    main()
