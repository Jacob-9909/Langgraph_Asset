"""최종 상담 LLM."""

from __future__ import annotations

import json
from typing import Any

from langchain.messages import AIMessage, HumanMessage, SystemMessage

from ..config import (
    ADVISOR_MACRO_NOTES_MAX_CHARS,
    ADVISOR_MARKET_NOTES_MAX_CHARS,
    ADVISOR_TAX_NOTES_MAX_CHARS,
)
from ..llm_utils import get_llm
from ..state import AssetAdvisoryState


def _clip(text: str, max_chars: int) -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n… (이하 입력 길이 제한으로 생략)"


def advisor_agent(state: AssetAdvisoryState) -> dict[str, Any]:
    llm = get_llm()
    sys = SystemMessage(
        content=(
            "너는 한국 시장 기준 자산·저축 상담사다."
            "입력의 '국내 상품 웹 요약'은 예금·적금·보험·채권 섹션으로 나뉘어 있다."
            "'거시 금리·정책 맥락'은 Tavily 로 수집한 미·일·한 기준금리·통화정책 요약이며,"
            "국내 예·적금·펀드 상품 설명이 아니다. 글로벌 금리 환경과 국내 상품을 과도하게 단정적으로 연결하지 말고,"
            "고객 이해를 돕는 배경 정도로만 인용해라."
            "'세법·공제 맥락'은 국세청 법령해석 목록 API 스니펫이며 유권해석·세무 자문이 아니다. 한도·요건은 연도·개정에 따라 바뀐다."
            "절대 구체적 세액을 단정하지 말고, 반드시 국세청·홈택스·소득공제 안내 또는 세무 전문가 확인을 권해라."
            "프로필의 소득 형태·소득 구간을 참고해 연금저축·IRP·ISA 등을 논할 때 맥락에 맞게 보수적으로 설명해라."
            "각 국내 섹션을 근거로 균형 있게 요약하고, 고객 프로필에 맞는 우선순위를 제시해라."
            "스니펫은 참고용이며 반드시 '가입 전 금융사·보험사 공식 채널 확인'을 넣어라."
            "불릿: (1) 고객 요약 (2) 예금/적금 (3) 보험·연금성 (4) 채권·중립적 대안"
            "(5) 글로벌 금리·정책 맥락의 시사점"
            "(6) 세제·연말정산 맥락(단정 금지)"
            "(7) 리스크·유의사항. "
            "전체 답변은 간결하게: 각 번호 항목마다 불필요한 반복 없이 핵심만."
        )
    )
    market = _clip(
        state.get("market_notes", ""), ADVISOR_MARKET_NOTES_MAX_CHARS
    )
    macro = _clip(
        state.get("macro_market_notes", ""), ADVISOR_MACRO_NOTES_MAX_CHARS
    )
    tax = _clip(state.get("tax_market_notes", ""), ADVISOR_TAX_NOTES_MAX_CHARS)

    human = HumanMessage(
        content=(
            "프로필:\n"
            f"{json.dumps(state.get('user_profile', {}), ensure_ascii=False)}\n\n"
            "국내 상품 웹 요약(네이버 구역별):\n"
            f"{market}\n\n"
            "거시 금리·정책 맥락(미·일·한):\n"
            f"{macro}\n\n"
            "세법·공제 맥락(국세청 법령해석 목록):\n"
            f"{tax}"
        )
    )
    out = llm.invoke([sys, human])
    text = str(out.content)
    return {
        "recommendation": text,
        "final_recommendation": text,
        "messages": [AIMessage(content=text)],
    }
