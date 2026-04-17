# Wealth Advisor — Frontend

React 19 + Vite + TypeScript SPA. FastAPI(`../server`)와 Twin Architecture로 동작합니다.

## 스택

- React 19, TypeScript, Vite 8
- Tailwind CSS v4
- Chart.js + react-chartjs-2 (백테스트 차트)
- react-markdown (AI 상담 결과 렌더링)
- Axios (API 클라이언트, JWT 자동 첨부)

## 개발 실행

```bash
npm install
npm run dev        # http://localhost:5173 (FastAPI :8000으로 프록시)
```

FastAPI 서버가 먼저 실행 중이어야 합니다:

```bash
cd ../../../../
uv run python examples/run_web.py
```

## 프로덕션 빌드

```bash
npm run build      # dist/ 생성
```

FastAPI가 `dist/`를 직접 서빙합니다 (`server/app.py` catch-all 라우트).

## 페이지 구성

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | HomePage | 랜딩 |
| `/login` | AuthPage | 로그인 / 회원가입 |
| `/dashboard` | DashboardPage | 포트폴리오 요약 |
| `/assets` | AssetsPage | 자산 CRUD |
| `/profile` | ProfilePage | 재무 프로필 편집 |
| `/agent` | AgentPage | LangGraph 멀티에이전트 상담 |
| `/backtest` | BacktestPage | 전략 백테스트 + SSE 그리드 서치 |
| `/cheongyak` | CheongyakPage | 청약 정보 (5개 탭) |
| `/admin` | AdminPage | 사용자 승인/관리 |

## 주요 구현 특이사항

- **SSE 그리드 서치**: `EventSource`는 POST/헤더 미지원 → `fetch` + `ReadableStream`으로 구현
- **자산 폼**: `asset_type`별 조건부 필드 (주식/예금/부동산) — 모달 없이 인라인 패널
- **JWT 자동 첨부**: `src/api/client.ts`의 Axios 인터셉터에서 `localStorage` 토큰 주입
