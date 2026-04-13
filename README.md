# Wealth Advisor

LangGraph 기반 멀티 에이전트 자산 상담 시스템.  
사용자의 재무 프로필과 보유 자산을 바탕으로 시장 조사, 거시경제 분석, 세법 해석을 병렬 수행한 뒤 종합 상담 리포트를 생성합니다.

## 요구 사항

- Python 3.11+
- PostgreSQL (체크포인터 + 웹 사용자 데이터 저장)
- [uv](https://docs.astral.sh/uv/)

## 설정

```bash
cp .env.example .env   # API 키, DB URL 등 입력
uv sync
```

필수 환경 변수: `GOOGLE_API_KEY`, `DATABASE_URL`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`, `TAVILY_API_KEY`, `LAW_GO_KR_OC`

## 실행

```bash
# CLI 모드 — 터미널에서 대화형 상담
uv run python examples/run_wealth_advisor.py

# Web UI — http://localhost:8000
uv run python examples/run_web.py
```

---

## 설계 과정

### 1단계: LangGraph 에이전트 설계 (CLI)

처음에는 사용자의 상황을 하나의 입력 쿼리로 직접 넣어 테스트했습니다.

```
"34세 직장인, 연봉 6천만원, 월 80만원 저축 가능, 1년 목표, 안정형"
```

이 텍스트를 `HumanMessage`로 그래프에 전달하면 5개 노드가 순차/병렬로 실행됩니다.

```
입력 (자유 텍스트)
  → profile_extract    프로필 구조화 (Gemini)
  → route_after_profile
      ├─ 누락 항목 있으면 → profile_hitl (Human-in-the-loop) → 재추출
      └─ 완료되면 병렬 실행:
           ├─ product_research   예금/적금/보험/채권 조사 (Naver 검색)
           ├─ news_research      미국/일본/한국 금리 동향 (Tavily)
           └─ tax_research       국세청 세법 해석 (law.go.kr API)
  → advisor_agent      종합 상담 리포트 생성 (Gemini)
```

이 단계에서 검증한 것:
- 프로필 추출 정확도와 누락 필드 감지 로직
- 병렬 리서치 노드의 안정성과 출력 품질
- Human-in-the-loop 인터럽트/재개 흐름
- PostgreSQL 체크포인터를 통한 상태 영속화

### 2단계: 사용자 데이터 영속화 (DB 설계)

CLI에서는 매번 사용자가 처음부터 정보를 입력해야 했습니다. 반복 사용을 위해 PostgreSQL에 사용자별 데이터를 저장하는 구조를 설계했습니다.

```
wa_users            이메일, 비밀번호(PBKDF2), 이름
wa_user_profiles    나이, 소득 형태, 소득 구간, 월 여유 자금, 위험 성향, 목표 등
wa_user_assets      자산 유형, 자산명, 금액, 금리, 만기일
wa_agent_results    시장 조사, 거시경제 조사, 세법 해석, 최종 추천 (실행 시점별)
```

에이전트가 기존에 `HumanMessage` 텍스트 하나로 받던 입력을 DB에 저장된 프로필 + 자산 목록으로부터 자동 조합하도록 변경했습니다.

### 3단계: Web UI 구현 (FastAPI + SPA)

CLI의 대화 흐름을 웹으로 전환하면서 다음 설계 결정을 내렸습니다.

**에이전트 실행 방식 변경:**  
CLI에서는 대화형으로 누락 정보를 물어봤지만, 웹에서는 사용자가 미리 프로필과 자산을 입력해두고 "상담 실행" 버튼으로 배치 실행합니다. 프로필이 불완전하면 에이전트가 기본값(안전형, 12개월)을 적용해 결과를 생성합니다.

**결과 구조화:**  
CLI에서는 최종 추천만 출력했지만, 웹에서는 에이전트가 수집한 리서치 데이터(시장, 거시경제, 세법)를 탭으로 분리해 사용자가 근거를 직접 확인할 수 있도록 했습니다.

```
[상담 실행]
  → 상담 시점 자산 현황 (프로필 요약 + 보유 자산 테이블)
  → [추천] [시장 조사] [거시경제] [세법 해석]  ← 탭 전환
```

### 기술 스택

| 계층 | 기술 |
|------|------|
| 에이전트 | LangGraph, Gemini 2.5-flash, LangChain |
| 리서치 도구 | Naver 검색 API, Tavily, law.go.kr 국세청 API |
| 백엔드 | FastAPI, SQLAlchemy, JWT (PBKDF2 해싱) |
| 프론트엔드 | Vanilla JS, Tailwind CSS (CDN), Chart.js |
| 데이터 | PostgreSQL (LangGraph 체크포인터 + 사용자 데이터) |
| 관측 | Langfuse (선택) |

---

## 프로젝트 구조

```
examples/
├── run_wealth_advisor.py          CLI 진입점
├── run_web.py                     웹 서버 진입점
└── wealth_advisor/
    ├── graph.py                   StateGraph 조립, 라우팅
    ├── state.py                   AssetAdvisoryState 정의
    ├── config.py                  모델, 리서치 설정
    ├── cli.py                     CLI 실행 루프
    ├── profile_helpers.py         프로필 누락 필드 검사
    ├── nodes/
    │   ├── profile.py             프로필 추출 + HitL
    │   ├── product_research.py    예금/적금/보험/채권 조사
    │   ├── news_research.py       미국/일본/한국 금리 조사
    │   ├── tax_research.py        국세청 세법 해석 조회
    │   └── advisor.py             종합 상담 리포트 생성
    ├── tools/
    │   ├── naver_web.py           Naver 검색 API 래퍼
    │   ├── tavily_search.py       Tavily 검색 래퍼
    │   └── nts_law.py             law.go.kr API 래퍼
    └── web/
        ├── app.py                 FastAPI 앱
        ├── auth.py                JWT 인증
        ├── database.py            SQLAlchemy 엔진
        ├── models.py              ORM 모델 (4 테이블)
        ├── schemas.py             Pydantic 스키마
        ├── routers/               API 라우터 (auth, profile, assets, agent, dashboard)
        ├── templates/index.html   SPA 템플릿
        └── static/                CSS, JS
```

## 문서

- [LangGraph 개요](https://docs.langchain.com/oss/python/langgraph/overview)

## 면책 조항

본 시스템의 분석 결과는 참고용이며, 투자 판단의 근거로 사용할 수 없습니다.  
금융 상품 가입 전 반드시 해당 금융기관에 직접 확인하시기 바랍니다.
