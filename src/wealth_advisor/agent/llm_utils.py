"""Gemini 클라이언트."""

from __future__ import annotations

from langchain_google_genai import ChatGoogleGenerativeAI

from .config import GEMINI_MODEL


def get_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model=GEMINI_MODEL, temperature=0)
