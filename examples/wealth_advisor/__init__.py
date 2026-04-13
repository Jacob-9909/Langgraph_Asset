"""예제 04 — 유저 자산·정책 멀티 에이전트 + HITL (패키지 분리본)."""

from __future__ import annotations

from langgraph_bootstrap import load_dotenv_for_example_04

load_dotenv_for_example_04()

from .advisor.graph import build_graph, route_after_profile  # noqa: E402

__all__ = ["build_graph", "route_after_profile"]
