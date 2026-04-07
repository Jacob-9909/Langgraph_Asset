"""
프로젝트 공통 — .env 로드 및 Langfuse 관측(LangChain/LangGraph 콜백).

Langfuse (자체 호스팅/클라우드 무료 티어):
  LANGFUSE_PUBLIC_KEY=pk-lf-...
  LANGFUSE_SECRET_KEY=sk-lf-...
  LANGFUSE_BASE_URL=https://cloud.langfuse.com  # 리전·자체 호스팅 URL은 Langfuse 문서 참고

문서: https://langfuse.com/docs/integrations/langchain
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import dotenv_values, load_dotenv

ROOT = Path(__file__).resolve().parent

_ENV_KEYS_04 = frozenset(
    {
        "GOOGLE_API_KEY",
        "DATABASE_URL",
        "LANGFUSE_PUBLIC_KEY",
        "LANGFUSE_SECRET_KEY",
        "LANGFUSE_HOST",
        "LANGFUSE_BASE_URL",
        "NAVER_CLIENT_ID",
        "NAVER_CLIENT_SECRET",
        "TAVILY_API_KEY",
        "LAW_GO_KR_OC",
        "NTS_LAW_FORCE_MOCK",
    }
)


def load_dotenv_full(env_path: Path | None = None) -> None:
    """전체 .env 로드."""

    load_dotenv(env_path or ROOT / ".env", override=False)


def load_dotenv_for_example_04(env_path: Path | None = None) -> None:
    """04 예제: DB·Langfuse·네이버·Tavily 등 `_ENV_KEYS_04` 키만 .env 에서 반영 (나머지는 코드 상수)."""

    path = env_path or ROOT / ".env"
    vals = dotenv_values(path)
    for key in _ENV_KEYS_04:
        v = vals.get(key)
        if v is not None and str(v).strip() != "":
            os.environ[key] = str(v).strip().strip('"').strip("'")


def get_langfuse_callback_handler() -> Any:
    """Langfuse 키가 있으면 CallbackHandler, 없으면 None."""

    if not (
        (os.environ.get("LANGFUSE_PUBLIC_KEY") or "").strip()
        and (os.environ.get("LANGFUSE_SECRET_KEY") or "").strip()
    ):
        return None
    from langfuse.langchain import CallbackHandler

    return CallbackHandler()


def merge_run_config(config: dict[str, Any] | None = None) -> dict[str, Any]:
    """RunnableConfig 에 Langfuse 콜백을 합친다 (graph.invoke/stream 시 전달).

    Langfuse Session / User: `config["metadata"]` 에
    `langfuse_session_id`, `langfuse_user_id` (문자열) 를 넣으면 CallbackHandler 가 trace 에 반영한다.
    """

    out: dict[str, Any] = dict(config) if config else {}
    handler = get_langfuse_callback_handler()
    if handler is not None:
        existing: list[Any] = list(out.get("callbacks") or [])
        out["callbacks"] = [*existing, handler]
    return out


def flush_langfuse_traces() -> None:
    """스크립트가 바로 종료될 때 미전송 스팬을 보내기 위해 flush (선택)."""

    if not (
        (os.environ.get("LANGFUSE_PUBLIC_KEY") or "").strip()
        and (os.environ.get("LANGFUSE_SECRET_KEY") or "").strip()
    ):
        return
    try:
        from langfuse import get_client

        get_client().flush()
    except Exception:
        pass
