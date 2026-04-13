"""프로필 파싱·누락 필드·폴백."""

from __future__ import annotations

import json
import re
from typing import Any

from langchain.messages import HumanMessage

from .state import AssetAdvisoryState


def parse_profile_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    try:
        return dict(json.loads(text))
    except json.JSONDecodeError:
        pass
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return dict(json.loads(m.group()))
        except json.JSONDecodeError:
            pass
    return {
        "age_band": "unknown",
        "monthly_surplus_krw": None,
        "horizon_months": None,
        "risk_tolerance": "mid",
        "goal": text[:400],
        "employment_type": "unknown",
        "annual_income_band": "unknown",
        "tax_wrappers_note": "",
        "nts_law_api_queries": [],
    }


def profile_missing_labels(profile: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    goal = (profile.get("goal") or "").strip()
    if len(goal) < 2:
        missing.append(
            "무엇 때문에 돈을 모으거나 불리고 싶은지 "
            "(예: 비상금, 1년 뒤 결혼 자금, 노후 준비)"
        )
    age = (profile.get("age_band") or "").strip().lower()
    if age in ("", "unknown", "미상"):
        missing.append("연령대 또는 나이 (예: 32세, 30대)")
    surplus = profile.get("monthly_surplus_krw")
    horizon = profile.get("horizon_months")
    if surplus is None and horizon is None:
        missing.append(
            "한 달에 저축·투자로 낼 수 있는 금액(원) 또는 목표 기간(개월) — 둘 중 하나만 있어도 됩니다"
        )
    emp = str(profile.get("employment_type") or "unknown").strip().lower()
    if emp in ("", "unknown"):
        missing.append(
            "소득·일 형태 (예: 직장인, 사업·자영업, 프리랜서, 주부·학생·은퇴, 기타)"
        )
    inc = str(profile.get("annual_income_band") or "unknown").strip().lower()
    if inc in ("", "unknown"):
        missing.append(
            "연간 총소득 대략 구간 (세액공제·연말정산 맥락): "
            "「~3.5천만」「3.5천~7천」「7천~1.2억」「1.2억 초과」 중 해당, 또는 「말하기 어려움」"
        )
    return missing


def apply_profile_fallback(profile: dict[str, Any]) -> dict[str, Any]:
    out = dict(profile)
    if len(str(out.get("goal") or "").strip()) < 2:
        out["goal"] = "원금 보존 위주 저축"
    if (out.get("age_band") or "").strip().lower() in ("", "unknown"):
        out["age_band"] = "미입력"
    if out.get("monthly_surplus_krw") is None and out.get("horizon_months") is None:
        out["horizon_months"] = 12
    if not (out.get("risk_tolerance") or "").strip():
        out["risk_tolerance"] = "low"
    if str(out.get("employment_type") or "unknown").strip().lower() in ("", "unknown"):
        out["employment_type"] = "other"
    if str(out.get("annual_income_band") or "unknown").strip().lower() in (
        "",
        "unknown",
    ):
        out["annual_income_band"] = "prefer_not_say"
    return out


def human_messages(state: AssetAdvisoryState) -> list[HumanMessage]:
    return [m for m in state["messages"] if isinstance(m, HumanMessage)]
