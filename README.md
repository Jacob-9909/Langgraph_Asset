# Langgraph_Asset

LangGraph 실습 프로젝트 — 상태 그래프, 멀티 에이전트, Human-in-the-loop, 웹 검색·세법 맥락 연동 예제.

## 요구 사항

- Python 3.11+ (`.python-version` 참고)
- [uv](https://docs.astral.sh/uv/) 권장

## 설정

```bash
cp .env.example .env
```

`.env`에 API 키·DB URL 등을 넣습니다. **`.env`는 저장소에 포함되지 않습니다** (`.gitignore`).

## 실행

프로젝트 루트에서:

```bash
uv sync
uv run python examples/03_quickstart_calculator_graph_api.py
uv run python examples/04_user_asset_policy_multi_agent_hitl.py
```

예제 04 본체: `examples/user_asset_hitl_04/` (노드·도구·그래프·CLI 분리).

## 문서

- [LangGraph 개요](https://docs.langchain.com/oss/python/langgraph/overview)
