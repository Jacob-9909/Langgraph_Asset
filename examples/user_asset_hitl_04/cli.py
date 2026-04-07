"""터미널 진입점: 체크포인터·interrupt 재개."""

from __future__ import annotations

import json
import os
import uuid
from typing import Any

from langchain.messages import HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import Command

from langgraph_bootstrap import flush_langfuse_traces, merge_run_config

from .config import USE_MEMORY_CHECKPOINTER, USER_INPUT_EXAMPLES
from .graph import build_graph
from .logging_utils import configure_logging
from .state import AssetAdvisoryState
from .tools.naver_web import require_naver_search_keys


def initial_state(user_line: str) -> AssetAdvisoryState:
    return {
        "messages": [HumanMessage(content=user_line)],
        "user_profile": {},
        "market_notes": "",
        "macro_market_notes": "",
        "tax_market_notes": "",
        "recommendation": "",
        "final_recommendation": "",
    }


def _risk_tolerance_ko(code: str | None) -> str:
    m = {"low": "낮음", "mid": "중간", "high": "높음"}.get((code or "").lower())
    return m or (code or "—")


def _employment_type_ko(code: str | None) -> str:
    m = {
        "employee": "직장인(근로)",
        "self_employed": "사업·자영업",
        "freelancer": "프리랜서 등",
        "homemaker_student_retiree": "주부·학생·은퇴 등",
        "other": "기타",
        "unknown": "—",
    }.get((code or "").lower())
    return m or (code or "—")


def _annual_income_band_ko(code: str | None) -> str:
    m = {
        "under_35m": "~약 3.5천만 원",
        "35m_to_70m": "약 3.5천~7천만 원",
        "70m_to_120m": "약 7천~1억2천만 원",
        "over_120m": "약 1억2천만 원 초과",
        "prefer_not_say": "구간 비공개",
        "unknown": "—",
    }.get((code or "").lower())
    return m or (code or "—")


def print_profile_clarification_ux(payload: dict[str, Any]) -> None:
    missing = payload.get("missing_fields") or []
    partial = payload.get("partial_profile") or {}
    width = 54
    bar = "─" * width

    print(f"\n┌{bar}┐", flush=True)
    print("│  입력을 조금만 더 부탁드려요".ljust(width + 1) + "│", flush=True)
    print(f"└{bar}┘", flush=True)

    known: list[str] = []
    ab = (partial.get("age_band") or "").strip()
    if ab and ab.lower() not in ("unknown", "미상"):
        known.append(f"나이·연령대: {ab}")
    rt = partial.get("risk_tolerance")
    if rt:
        known.append(f"위험 감수 성향: {_risk_tolerance_ko(str(rt))}")
    sg = (partial.get("goal") or "").strip()
    if len(sg) >= 2:
        known.append(f"목표(일부): {sg[:80]}{'…' if len(sg) > 80 else ''}")
    ms = partial.get("monthly_surplus_krw")
    if ms is not None:
        known.append(f"월 여유 금액: 약 {ms:,}원")
    hm = partial.get("horizon_months")
    if hm is not None:
        known.append(f"목표 기간: 약 {hm}개월")
    et = partial.get("employment_type")
    if et and str(et).lower() != "unknown":
        known.append(f"소득 형태: {_employment_type_ko(str(et))}")
    ib = partial.get("annual_income_band")
    if ib and str(ib).lower() not in ("unknown",):
        known.append(f"연 소득(대략 구간): {_annual_income_band_ko(str(ib))}")
    tw = (partial.get("tax_wrappers_note") or "").strip()
    if len(tw) >= 2:
        known.append(
            f"세제 계좌 메모: {tw[:80]}{'…' if len(tw) > 80 else ''}"
        )

    if known:
        print("\n  ✓ 지금까지 이해한 내용:", flush=True)
        for line in known:
            print(f"    · {line}", flush=True)

    print("\n  아래 항목을 채워 주세요. 한 줄에 같이 적으셔도 됩니다.\n", flush=True)
    for i, item in enumerate(missing, 1):
        print(f"    {i}) {item}", flush=True)

    print(
        "\n  💡 예: 「직장인, 연 6천대, 연금저축 없음 / 목표 2년·천만 원·월 40만」처럼 "
        "소득 형태·구간과 저축 목표를 함께 적어 주세요.\n",
        flush=True,
    )


def _resume_prompt_for_payload(payload: Any) -> str:
    if not isinstance(payload, dict):
        try:
            return input("\n입력: ").strip()
        except EOFError:
            return ""

    if payload.get("step") == "profile_clarification":
        try:
            return input("추가로 입력 (여러 줄이면 붙여넣기 후 엔터): ").strip()
        except EOFError:
            return ""

    try:
        return input("\n입력: ").strip()
    except EOFError:
        return ""


def run_cli(graph: Any, config: dict, user_line: str) -> None:
    cmd: Any = initial_state(user_line)
    while True:
        r = graph.invoke(cmd, config=config, version="v2")
        if not r.interrupts:
            if isinstance(r.value, dict):
                fin = r.value.get("final_recommendation") or r.value.get(
                    "recommendation", ""
                )
                if fin:
                    print("\n=== 결과 ===\n")
                    print(fin)
            flush_langfuse_traces()
            return

        payload = r.interrupts[0].value
        step = payload.get("step") if isinstance(payload, dict) else None
        if step == "profile_clarification" and isinstance(payload, dict):
            print_profile_clarification_ux(payload)
        else:
            print("\n=== 작업 중단 — 추가 입력 필요 ===", flush=True)
            print(json.dumps(payload, ensure_ascii=False, indent=2), flush=True)

        resume_val = _resume_prompt_for_payload(payload)
        cmd = Command(resume=resume_val)


def read_initial_user_message() -> str:
    print("\n── 참고: 첫 입력 예시 (복사해 써도 됨) ──", flush=True)
    for i, ex in enumerate(USER_INPUT_EXAMPLES, start=1):
        print(f"  [{i}] {ex}", flush=True)
    print(
        "\n첫 상담/프로필 내용을 입력하세요. "
        "(여러 줄 · 붙여넣기 가능. 입력 끝: 빈 줄에서 엔터)\n",
        flush=True,
    )
    lines: list[str] = []
    while True:
        try:
            line = input()
        except EOFError:
            break
        if line == "":
            break
        lines.append(line)
    text = "\n".join(lines).strip()
    if not text:
        raise SystemExit(
            "첫 입력이 비었습니다. 금융 상담 맥락·프로필을 한 줄 이상 입력하세요."
        )
    return text


def main() -> None:
    configure_logging()

    if not (
        os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    ):
        raise SystemExit(
            "Gemini API 키가 필요합니다. .env 에 GOOGLE_API_KEY / GEMINI_API_KEY 를 설정하세요."
        )
    try:
        require_naver_search_keys()
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    thread_id = str(uuid.uuid4())
    initial_message = read_initial_user_message()

    config: dict = merge_run_config(
        {
            "configurable": {"thread_id": thread_id},
            "metadata": {"langfuse_session_id": thread_id},
        }
    )

    if USE_MEMORY_CHECKPOINTER:
        print("checkpointer=InMemorySaver (USE_MEMORY_CHECKPOINTER=True)", flush=True)
        print(f"thread_id={thread_id}\n", flush=True)
        g = build_graph(InMemorySaver())
        run_cli(g, config, initial_message)
        return

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise SystemExit(
            ".env 에 DATABASE_URL 을 설정하세요."
        )

    print("checkpointer=PostgresSaver", flush=True)
    print(f"thread_id={thread_id}\n", flush=True)
    with PostgresSaver.from_conn_string(db_url) as cp:
        cp.setup() # setup database table if not exists
        g = build_graph(cp)
        run_cli(g, config, initial_message)
