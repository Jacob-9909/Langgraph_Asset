"""세법 맥락 (국세청 법령해석 API / mock)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from langchain.messages import AIMessage

from ..state import AssetAdvisoryState
from ..tools.nts_law import (
    nts_cgm_search_once,
    nts_law_use_mock,
    tax_research_query_specs,
)


def tax_research_agent(state: AssetAdvisoryState) -> dict[str, Any]:
    profile = state.get("user_profile") or {}
    specs = tax_research_query_specs(profile)

    def one(section: tuple[str, str]) -> str:
        label, query = section
        body = nts_cgm_search_once(query, display=8)
        return f"### {label}\n{body}"

    with ThreadPoolExecutor(max_workers=max(1, len(specs))) as pool:
        sections = list(pool.map(one, specs))

    tw = (profile.get("tax_wrappers_note") or "").strip()
    mode = "mock" if nts_law_use_mock() else "live"
    header_lines = [
        "[국세청 법령해석 목록 기반 맥락 — 세무 자문·유권해석 대체 아님. 홈택스·국세청 공식 확인 필요]",
        f"소스: law.go.kr ntsCgmExpc ({mode})",
        f"employment_type={profile.get('employment_type')!s}, "
        f"annual_income_band={profile.get('annual_income_band')!s}",
    ]
    if tw:
        header_lines.append(f"고객 메모(기존 계좌): {tw}")
    tax_market_notes = "\n".join(header_lines) + "\n\n" + "\n\n".join(sections)
    tax_market_notes = tax_market_notes[:18_000]

    return {
        "tax_market_notes": tax_market_notes,
        "messages": [
            AIMessage(
                content=(
                    f"[세법 맥락·국세청 법령해석 API, {mode}] 주제 {len(specs)}건 병렬, "
                    f"총 {len(tax_market_notes)}자"
                )
            )
        ],
    }
