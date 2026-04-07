"""거시 금리 리서치 (Tavily)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from langchain.messages import AIMessage
from langchain_tavily import TavilySearch

from ..state import AssetAdvisoryState
from ..tools.tavily_search import require_tavily_api_key, tavily_search_body


def news_research_agent(_state: AssetAdvisoryState) -> dict[str, Any]:
    require_tavily_api_key()
    tool = TavilySearch(
        max_results=4,
        topic="finance",
        search_depth="basic",
        include_answer=True,
    )
    specs: list[tuple[str, str]] = [
        (
            "미국",
            "Federal Reserve Fed funds target rate benchmark interest rate current",
        ),
        (
            "일본",
            "Bank of Japan BOJ policy interest rate yield curve control latest",
        ),
        (
            "한국",
            "Bank of Korea BOK base rate policy rate 한국은행 기준금리 최신",
        ),
    ]

    def one(section: tuple[str, str]) -> str:
        label, query = section
        body = tavily_search_body(tool, query)
        return f"### {label}\n{body}"

    with ThreadPoolExecutor(max_workers=len(specs)) as pool:
        sections = list(pool.map(one, specs))

    macro_market_notes = "\n\n".join(sections)
    macro_market_notes = macro_market_notes[:16_000]

    return {
        "macro_market_notes": macro_market_notes,
        "messages": [
            AIMessage(
                content=(
                    f"[거시 리서치·Tavily] 미·일·한 금리 맥락, 총 {len(macro_market_notes)}자"
                )
            )
        ],
    }
