"""프로필 추출·HITL."""

from __future__ import annotations

import json
from typing import Any

from langchain.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import interrupt

from ..config import PROFILE_MAX_HUMAN_MESSAGES
from ..llm_utils import get_llm
from ..profile_helpers import (
    apply_profile_fallback,
    human_messages,
    parse_profile_json,
    profile_missing_labels,
)
from ..state import AssetAdvisoryState, ExtractedUserProfile


def profile_extract(state: AssetAdvisoryState) -> dict[str, Any]:
    llm = get_llm()
    humans = human_messages(state)
    if not humans:
        raise SystemExit("HumanMessage 가 없습니다.")

    sys = SystemMessage(
        content=(
            "너는 금융 상담용 정보 추출기다. 아래 Human 메시지에 적힌 사실만 반영한다. "
            "추측하지 말고, 숫자·기간이 없거나 애매하면 null 또는 unknown / 빈 문자열로 둔다. "
            "소득 형태(직장인·사업·프리랜서 등)와 연 소득 대략 구간(세법·공제 맥락)은 반드시 스키마 필드를 채울 수 있으면 채운다. "
            "사용자가 소득 구간을 원치 않으면 annual_income_band 에 prefer_not_say. "
            "nts_law_api_queries 는 국세청 법령해석 포털 검색용이다. 사용자 질의·목표·세제메모를 바탕으로 "
            "검색에 잘 맞는 짧은 세법 키워드(한국어 명사구) 1~3개를 채운다(중복 금지). "
            "출력은 시스템이 요구하는 구조화 스키마(필드만)에 맞춘다 — 자연어 설명이나 마크다운은 쓰지 않는다."
        )
    )
    combined = HumanMessage(
        content="\n---\n".join(str(m.content) for m in humans),
    )
    profile: dict[str, Any]
    try:
        structured = llm.with_structured_output(ExtractedUserProfile)
        parsed = structured.invoke([sys, combined])
        if isinstance(parsed, ExtractedUserProfile):
            profile = parsed.model_dump()
        elif isinstance(parsed, dict):
            profile = ExtractedUserProfile.model_validate(parsed).model_dump()
        else:
            raise TypeError(f"unexpected structured output type: {type(parsed)}")
    except Exception:
        fallback = SystemMessage(
            content=(
                "너는 금융 상담용 정보 추출기다. 출력은 UTF-8 JSON 객체 한 개만 (앞뒤 공백·다른 텍스트 금지). 키: "
                "age_band, monthly_surplus_krw, horizon_months, risk_tolerance, goal, "
                "employment_type, annual_income_band, tax_wrappers_note, nts_law_api_queries. "
                "monthly_surplus_krw·horizon_months 는 숫자 또는 null. "
                'risk_tolerance 는 "low" | "mid" | "high". '
                'employment_type 은 "employee"|"self_employed"|"freelancer"|'
                '"homemaker_student_retiree"|"other"|"unknown". '
                "annual_income_band 는 under_35m|35m_to_70m|70m_to_120m|over_120m|"
                "prefer_not_say|unknown. "
                "사용자가 소득 구간을 밝히기 싫으면 prefer_not_say. "
                "tax_wrappers_note 는 연금저축·IRP·ISA 등 한 줄 문자열(없으면 \"\"). "
                "nts_law_api_queries 는 국세청 법령해석 검색용 짧은 키워드 문자열 배열(1~5개, 검색에 맞는 세법 용어). "
                "goal·age_band 는 문자열. 코드펜스(```) 사용 금지."
            )
        )
        raw = str(llm.invoke([fallback, combined]).content)
        profile = parse_profile_json(raw)
    missing = profile_missing_labels(profile)

    if len(humans) >= PROFILE_MAX_HUMAN_MESSAGES and missing:
        profile = apply_profile_fallback(profile)
        missing = []

    if missing:
        return {
            "user_profile": profile,
            "messages": [
                AIMessage(
                    content=(
                        "[프로필] 아래를 조금만 더 알려주시면 맞춤 상담을 이어갈 수 있어요. "
                        + " / ".join(missing)
                    )
                )
            ],
        }

    return {
        "user_profile": profile,
        "messages": [
            AIMessage(
                content=f"[프로필 에이전트] 확정: {json.dumps(profile, ensure_ascii=False)}"
            )
        ],
    }


def profile_hitl(state: AssetAdvisoryState) -> dict[str, Any]:
    missing = profile_missing_labels(state.get("user_profile") or {})
    extra = interrupt(
        {
            "step": "profile_clarification",
            "missing_fields": missing,
            "partial_profile": state.get("user_profile") or {},
            "message": "부족한 항목을 숫자·짧은 문장으로 입력하세요. 여러 줄·한 번에 여러 항목도 가능합니다.",
        }
    )
    return {"messages": [HumanMessage(content=str(extra))]}
