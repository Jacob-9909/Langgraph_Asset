"""StateGraph 조립·라우팅."""

from __future__ import annotations

from typing import Literal

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from .nodes import (
    advisor_agent,
    news_research_agent,
    product_research_agent,
    profile_extract,
    profile_hitl,
    tax_research_agent,
)
from .profile_helpers import profile_missing_labels
from .state import AssetAdvisoryState


def route_after_profile(
    state: AssetAdvisoryState,
) -> Literal["profile_hitl"] | list[Send]:
    if profile_missing_labels(state.get("user_profile") or {}):
        return "profile_hitl"
    return [
        Send("product_research_agent", {}),
        Send("news_research_agent", {}),
        Send("tax_research_agent", {}),
    ]


def build_graph(checkpointer: InMemorySaver | PostgresSaver):
    builder = StateGraph(AssetAdvisoryState)
    builder.add_node("profile_extract", profile_extract)
    builder.add_node("profile_hitl", profile_hitl)
    builder.add_node("product_research_agent", product_research_agent)
    builder.add_node("news_research_agent", news_research_agent)
    builder.add_node("tax_research_agent", tax_research_agent)
    builder.add_node("advisor_agent", advisor_agent)
    builder.add_edge(START, "profile_extract")
    builder.add_conditional_edges(
        "profile_extract",
        route_after_profile,
    )
    builder.add_edge("profile_hitl", "profile_extract")
    builder.add_edge("product_research_agent", "advisor_agent")
    builder.add_edge("news_research_agent", "advisor_agent")
    builder.add_edge("tax_research_agent", "advisor_agent")
    builder.add_edge("advisor_agent", END)
    return builder.compile(checkpointer=checkpointer)
