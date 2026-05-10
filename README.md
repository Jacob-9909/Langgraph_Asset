# Wealth Advisor

LangGraph 기반 멀티 에이전트 자산 상담 플랫폼.  
사용자의 재무 프로필과 보유 자산을 바탕으로 시장 조사 · 거시경제 분석 · 세법 해석을 병렬 수행한 뒤 종합 상담 리포트를 생성합니다.

## 기술 스택

| 계층 | 기술 |
|---|---|
| 에이전트 | LangGraph, Gemini 2.5-flash, LangChain |
| 리서치 도구 | Naver 검색 API, Tavily, law.go.kr 국세청 API, 공공데이터포털 청약 API |
| 백엔드 | FastAPI, SQLAlchemy, JWT (PBKDF2), SlowAPI |
| 프론트엔드 | Vanilla JS, Tailwind CSS, Chart.js, Leaflet.js |
| 데이터베이스 | PostgreSQL (LangGraph 체크포인터 + 사용자 데이터) |
| 관측 | Langfuse (선택) |

## 시작하기

```bash
cp .env.example .env   # API 키, DB URL 입력
uv sync
```

**필수 환경 변수**

```
GOOGLE_API_KEY
DATABASE_URL
NAVER_CLIENT_ID / NAVER_CLIENT_SECRET
TAVILY_API_KEY
LAW_GO_KR_OC
CHEONGYAK_API_KEY
```

## 실행 명령어

```bash
# Docker(Postgres) + Web 서버 한 번에 시작 — http://localhost:8000
uv run python scripts/dev.py

# Docker(Postgres) + CLI 상담
uv run python scripts/dev.py --cli

# HTTPS — https://localhost:8443
uv run python scripts/dev.py --https

# 포트 지정
uv run python scripts/dev.py --port 9000

# Postgres만 시작 (개발 중 DB만 필요할 때)
uv run python scripts/dev.py docker

# Postgres 종료
uv run python scripts/dev.py stop
```

## 파일 구조

```
src/wealth_advisor/
├── core/
│   ├── bootstrap.py          dotenv 로드, Langfuse 콜백
│   └── logging.py            로깅 설정
│
├── agent/                    LangGraph 에이전트
│   ├── graph.py              StateGraph 조립 및 라우팅
│   ├── state.py              AssetAdvisoryState 정의
│   ├── config.py             모델명, 리서치 설정 상수
│   ├── llm_utils.py          Gemini 클라이언트
│   ├── profile_helpers.py    프로필 누락 필드 검사
│   ├── nodes/
│   │   ├── profile.py        프로필 추출 + Human-in-the-loop
│   │   ├── product_research.py   예금/적금/보험/채권 조사
│   │   ├── news_research.py      금리 동향 조사
│   │   ├── tax_research.py       국세청 세법 해석
│   │   └── advisor.py        종합 상담 리포트 생성
│   └── tools/
│       ├── naver_web.py      Naver 검색 API 래퍼
│       ├── tavily_search.py  Tavily 래퍼
│       └── nts_law.py        law.go.kr API 래퍼
│
├── api/                      FastAPI 웹 레이어
│   ├── app.py                앱 팩토리, 라우터 등록
│   ├── auth.py               JWT 인증 / 권한 의존성
│   ├── certs.py              로컬 HTTPS 자체 서명 인증서
│   ├── schemas.py            Pydantic 요청/응답 스키마
│   ├── routers/
│   │   ├── auth.py           회원가입, 로그인
│   │   ├── profile.py        프로필 CRUD
│   │   ├── assets.py         자산 CRUD
│   │   ├── agent.py          에이전트 실행 및 결과 조회
│   │   ├── dashboard.py      대시보드 요약
│   │   ├── backtest.py       백테스트 실행, 그리드 서치, AI 분석
│   │   ├── admin.py          사용자 승인 / 관리자 통계
│   │   └── cheongyak.py      청약 정보 API
│   ├── services/
│   │   └── cheongyak.py      청약 서비스 레이어
│   ├── static/               app.js, style.css, images/
│   └── templates/            index.html (SPA)
│
├── db/                       데이터베이스 레이어
│   ├── session.py            SQLAlchemy 엔진 및 세션 팩토리
│   └── models.py             ORM 모델 (User, Profile, Asset, AgentResult, BacktestResult)
│
├── services/                 외부 서비스 클라이언트
│   ├── cheongyak/
│   │   └── api_client.py     공공데이터포털 청약 API
│   └── trading/
│       ├── stock_analyzer.py 전략별 백테스트 엔진
│       └── ai_analysis.py    AI 전략 분석
│
└── cli.py                    터미널 대화형 상담 루프

scripts/
├── run_web.py                웹 서버 진입점
└── run_advisor.py            CLI 진입점

tests/
```

## 면책 조항

본 시스템의 분석 결과는 참고용이며 투자 판단의 근거로 사용할 수 없습니다.  
금융 상품 가입 전 반드시 해당 금융기관에 직접 확인하시기 바랍니다.
