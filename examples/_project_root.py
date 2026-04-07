"""예제 실행 시 프로젝트 루트를 sys.path 에 넣어 langgraph_bootstrap 를 import 할 수 있게 한다."""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))
