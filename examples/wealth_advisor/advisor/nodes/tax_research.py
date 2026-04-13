"""세법 맥락 (국가법령정보 국세청 법령해석 목록 API, ntsCgmExpc)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from langchain.messages import AIMessage

from ..state import AssetAdvisoryState
from ..tools.nts_law import (
    nts_cgm_search_once,
    require_law_go_kr_oc,
    resolve_nts_law_search_specs,
)


def tax_research_agent(state: AssetAdvisoryState) -> dict[str, Any]:
    require_law_go_kr_oc()
    profile = state.get("user_profile") or {}
    specs = resolve_nts_law_search_specs(profile)

    def one(section: tuple[str, str]) -> str:
        label, query = section
        body = nts_cgm_search_once(query, display=8)
        return f"### {label}\n{body}"

    with ThreadPoolExecutor(max_workers=max(1, len(specs))) as pool:
        sections = list(pool.map(one, specs))

    tw = (profile.get("tax_wrappers_note") or "").strip()
    emp = profile.get("employment_type")
    band = profile.get("annual_income_band")
    hints: list[str] = []
    if emp and str(emp).lower() != "unknown":
        hints.append(f"질의맥락·소득형태={emp}")
    if band and str(band).lower() not in ("unknown", ""):
        hints.append(f"연소득구간={band}")
    if tw:
        hints.append(f"고객세제메모={tw}")
    hint_line = " · ".join(hints) if hints else ""

    header_lines = [
        "국세청 법령해석 '목록' 스니펫(유권해석 아님). 세액·요건은 국세청·홈택스 확인.",
    ]
    if hint_line:
        header_lines.append(hint_line)
    tax_market_notes = "\n".join(header_lines) + "\n\n" + "\n\n".join(sections)
    tax_market_notes = tax_market_notes[:18_000]

    return {
        "tax_market_notes": tax_market_notes,
        "messages": [
            AIMessage(
                content=(
                    f"[세법 맥락·국세청 법령해석 API] 주제 {len(specs)}건 병렬, "
                    f"총 {len(tax_market_notes)}자"
                )
            )
        ],
    }
