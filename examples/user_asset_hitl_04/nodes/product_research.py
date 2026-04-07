"""국내 상품 리서치 (네이버 webkr)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Any

from langchain.messages import AIMessage

from ..state import AssetAdvisoryState
from ..tools.naver_web import (
    naver_query_suffix,
    naver_web_snippets,
    require_naver_search_keys,
)


def product_research_agent(state: AssetAdvisoryState) -> dict[str, Any]: # synchronous node -> async 변경 예정
    require_naver_search_keys()
    profile = state.get("user_profile") or {}
    tail = naver_query_suffix(profile)
    tail_sp = f" {tail}" if tail else ""

    query_specs: list[tuple[str, str, str]] = [
        (
            "예금_정기_보통예금",
            f"정기예금 금리{tail_sp}".strip(),
            "정기예금 금리",
        ),
        (
            "적금_정기적금",
            f"정기적금 금리{tail_sp}".strip(),
            "적금 금리",
        ),
        (
            "보험_저축_연금성",
            f"연금저축 세액공제 비교{tail_sp}".strip(),
            "연금저축 세액공제",
        ),
        (
            "채권_국채_회사채",
            f"월금액별 국채 ETF 추천{tail_sp}".strip(),
            "국채 ETF 추천",
        ),
    ]

    with ThreadPoolExecutor(max_workers=len(query_specs)) as pool: # 단순 I/O request 이므로 ThreadPoolExecutor 사용
        futures = {
            name: pool.submit(
                partial(naver_web_snippets, primary, 4, fallback_query=fallback)
            )
            for name, primary, fallback in query_specs
        }
        sections = {name: futures[name].result() for name, _, _ in query_specs}

    blocks: list[str] = []
    for title, body in sections.items():
        label = title.replace("_", "·")
        blocks.append(f"### {label}\n{body[:3000]}")
    market_notes = "\n\n".join(blocks)
    market_notes = market_notes[:20_000]

    return {
        "market_notes": market_notes,
        "messages": [
            AIMessage(
                content=(
                    f"[상품 리서치·네이버] 카테고리 {len(query_specs)} 병렬 검색, "
                    f"총 {len(market_notes)}자"
                )
            )
        ],
    }
