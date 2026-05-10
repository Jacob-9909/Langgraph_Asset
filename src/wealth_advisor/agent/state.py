"""LangGraph 상태·프로필 스키마."""

from __future__ import annotations

import operator
from typing import Annotated, Any, Literal

from langchain.messages import AnyMessage
from pydantic import BaseModel, ConfigDict, Field
from typing_extensions import TypedDict

EmploymentKind = Literal[ # 소득·근로 형태
    "employee",
    "self_employed",
    "freelancer",
    "homemaker_student_retiree",
    "other",
    "unknown",
]
AnnualIncomeBand = Literal[ # 연간 총소득(세법·공제 맥락용 대략 구간, 원 단위 기준)
    "under_35m",
    "35m_to_70m",
    "70m_to_120m",
    "over_120m",
    "prefer_not_say",
    "unknown",
]


class AssetAdvisoryState(TypedDict): 
    messages: Annotated[list[AnyMessage], operator.add]
    user_profile: dict[str, Any] # 사용자 프로필
    market_notes: str # 시장 정보
    macro_market_notes: str # 거시 금리·정책 맥락
    tax_market_notes: str # 세법·공제 맥락
    recommendation: str # 최종 상담 권고
    final_recommendation: str # 최종 상담 권고


class ExtractedUserProfile(BaseModel):
    """Gemini structured output 으로 강제하는 프로필 스키마 (JSON 객체로 직렬화)."""

    model_config = ConfigDict(extra="ignore")

    age_band: str = Field(
        description="연령대 또는 나이에 대한 짧은 한국어 설명 (예: 30대, 32세)."
    )
    monthly_surplus_krw: int | None = Field(
        default=None,
        description="월 여유금액(원 단위 정수). 불명확하면 null.",
    )
    horizon_months: int | None = Field(
        default=None,
        description="목표 기간(개월). 불명확하면 null.",
    )
    risk_tolerance: Literal["low", "mid", "high"] = Field(
        description="저축·투자 위험 성향: low / mid / high 중 하나.",
    )
    goal: str = Field(description="저축 또는 투자 목표를 한국어로 한두 문장.")
    employment_type: EmploymentKind = Field(
        default="unknown",
        description=(
            "소득·근로 형태: employee=직장인(근로) "
            "self_employed=사업·자영업 freelancer=프리랜서 등 "
            "homemaker_student_retiree=주부·학생·은퇴 등 소득 단순 other=기타 unknown=불명"
        ),
    )
    annual_income_band: AnnualIncomeBand = Field(
        default="unknown",
        description=(
            "연간 총소득(세법·공제 맥락용 대략 구간, 원 단위 기준): "
            "under_35m=약 3.5천 미만, 35m_to_70m=약 3.5천~7천, "
            "70m_to_120m=약 7천~1억2천, over_120m=약 1억2천 초과, "
            "prefer_not_say=밝히기 어려움, unknown=대화에서 판단 불가"
        ),
    )
    tax_wrappers_note: str = Field(
        default="",
        description=(
            "연금저축·퇴직연금 DC·IRP·ISA 등 이미 쓰는 세제 혜택 계좌·납입 여부 한 줄. 없으면 빈 문자열."
        ),
    )
    nts_law_api_queries: list[str] = Field(
        default_factory=list,
        description=(
            "국가법령정보 국세청 법령해석 검색(law.go.kr target=ntsCgmExpc)용 키워드. "
            "사용자 질문·목표·세제 메모를 반영하되, 포털 검색에 잘 걸리는 짧은 세법 용어로 바꾼다 "
            "(예: '절세'→연말정산 또는 세액공제, 'IRP'→IRP 또는 개인형퇴직연금, '부가세'→부가가치세). "
            "한 키워드당 2~12자 한국어 위주, 서로 다른 주제 최대 5개, 중복·빈 문자열 금지."
        ),
    )
