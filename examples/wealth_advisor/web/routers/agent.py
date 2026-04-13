"""Agent execution route — run the wealth advisor graph with user's stored data."""

from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from langchain.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from sqlalchemy.orm import Session

from langgraph_bootstrap import flush_langfuse_traces, merge_run_config

from ...config import USE_MEMORY_CHECKPOINTER
from ...graph import build_graph
from ...state import AssetAdvisoryState
from ..auth import get_current_user
from ..database import get_db
from ..models import AgentResult, User, UserAsset
from ..schemas import AgentResultResponse

router = APIRouter(prefix="/api/agent", tags=["agent"])


def _build_user_message(user: User, assets: list[UserAsset]) -> str:
    """Compose a first-turn message from stored profile + assets."""
    profile = user.profile
    lines: list[str] = []

    if profile:
        if profile.age_band:
            lines.append(f"나이/연령대: {profile.age_band}")
        if profile.employment_type:
            lines.append(f"소득 형태: {profile.employment_type}")
        if profile.annual_income_band:
            lines.append(f"연 소득 구간: {profile.annual_income_band}")
        if profile.monthly_surplus_krw:
            lines.append(f"월 여유 자금: 약 {profile.monthly_surplus_krw:,}원")
        if profile.horizon_months:
            lines.append(f"목표 기간: {profile.horizon_months}개월")
        if profile.risk_tolerance:
            lines.append(f"위험 감수 성향: {profile.risk_tolerance}")
        if profile.goal:
            lines.append(f"목표: {profile.goal}")
        if profile.tax_wrappers_note:
            lines.append(f"세제 혜택 계좌: {profile.tax_wrappers_note}")

    if assets:
        lines.append("\n현재 보유 자산:")
        for a in assets:
            detail = f"  - {a.asset_name} ({a.asset_type}): {a.amount_krw:,}원"
            if a.interest_rate:
                detail += f", 금리 {a.interest_rate}%"
            if a.maturity_date:
                detail += f", 만기 {a.maturity_date}"
            lines.append(detail)

    if not lines:
        return "현재 자산 정보를 바탕으로 종합 재무 상담을 부탁드립니다."

    lines.append("\n위 정보를 바탕으로 종합 재무 상담을 부탁드립니다.")
    return "\n".join(lines)


def _run_graph(user_message: str) -> dict:
    """Execute the wealth advisor graph and return the final state dict."""
    thread_id = str(uuid.uuid4())
    config = merge_run_config(
        {
            "configurable": {"thread_id": thread_id},
            "metadata": {"langfuse_session_id": thread_id},
        }
    )

    init_state: AssetAdvisoryState = {
        "messages": [HumanMessage(content=user_message)],
        "user_profile": {},
        "market_notes": "",
        "macro_market_notes": "",
        "tax_market_notes": "",
        "recommendation": "",
        "final_recommendation": "",
    }

    if USE_MEMORY_CHECKPOINTER:
        graph = build_graph(InMemorySaver())
    else:
        db_url = os.environ.get("DATABASE_URL", "")
        if not db_url:
            raise HTTPException(status_code=500, detail="DATABASE_URL not configured")
        with PostgresSaver.from_conn_string(db_url) as cp:
            cp.setup()
            graph = build_graph(cp)
            result = graph.invoke(init_state, config=config, version="v2")
            flush_langfuse_traces()
            if result.interrupts:
                # Auto-resume with fallback for web mode
                from langgraph.types import Command
                result = graph.invoke(
                    Command(resume="웹에서 자동 실행 — 누락 항목은 기본값 적용"),
                    config=config,
                    version="v2",
                )
            val = result.value if hasattr(result, "value") else result
            return val if isinstance(val, dict) else {}

    graph = build_graph(InMemorySaver())
    result = graph.invoke(init_state, config=config, version="v2")
    flush_langfuse_traces()
    if result.interrupts:
        from langgraph.types import Command
        result = graph.invoke(
            Command(resume="웹에서 자동 실행 — 누락 항목은 기본값 적용"),
            config=config,
            version="v2",
        )
    val = result.value if hasattr(result, "value") else result
    return val if isinstance(val, dict) else {}


@router.post("/run", response_model=AgentResultResponse)
def run_agent(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_message = _build_user_message(user, user.assets)
    state = _run_graph(user_message)

    agent_result = AgentResult(
        user_id=user.id,
        market_notes=state.get("market_notes"),
        macro_market_notes=state.get("macro_market_notes"),
        tax_market_notes=state.get("tax_market_notes"),
        recommendation=state.get("final_recommendation") or state.get("recommendation"),
    )
    db.add(agent_result)
    db.commit()
    db.refresh(agent_result)
    return AgentResultResponse.model_validate(agent_result)


@router.get("/results", response_model=list[AgentResultResponse])
def list_results(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [AgentResultResponse.model_validate(r) for r in user.agent_results]
