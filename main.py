"""
LangGraph 실습 프로젝트 (uv 관리).

문서: https://docs.langchain.com/oss/python/langgraph/overview

실행 예:
  uv run python examples/01_minimal_stategraph.py
  cp .env.example .env  # API 키 + 선택 LANGFUSE_* (관측)
  uv run python examples/02_llm_messages_graph.py
  uv run python examples/03_quickstart_calculator_graph_api.py  # Gemini
  uv run python examples/run_wealth_advisor.py  # 로직은 examples/wealth_advisor/
"""


def main() -> None:
    print("examples/ 디렉터리의 스크립트를 실행하세요. 도움말은 이 파일 상단 docstring.")


if __name__ == "__main__":
    main()
