"""AI-powered stock analysis report generator (Google Gemini)."""

from __future__ import annotations

import datetime
import os


async def generate_analysis(
    ticker: str,
    strategy_name: str,
    metrics: dict,
    *,
    max_rows: int = 60,
) -> str | None:
    """Call Google Gemini to produce a Korean investment report in markdown."""
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    # ── market context (best-effort) ──────────────────
    fng_text = _fetch_fng()
    vix_text = _fetch_vix()
    profile_text = _fetch_profile(ticker)

    result_text = (
        f"총 거래 횟수: {metrics.get('total_trades', 'N/A')}\n"
        f"전략 총 수익률: {metrics.get('total_return', 0):.2%}\n"
        f"매수 후 보유 수익률: {metrics.get('buy_hold_return', 0):.2%}\n"
        f"연간 수익률: {metrics.get('annual_return', 0):.2%}\n"
        f"최대 낙폭: {metrics.get('max_drawdown', 0):.2%}\n"
        f"최종 포트폴리오 가치: {metrics.get('final_value', 0):,.0f}원"
    )

    prompt = f"""너는 주식 리서치 및 트레이딩 전략 분석에 특화된 최고 수준의 금융 전문가다.
아래는 {ticker} 종목에 대한 분석 데이터이다.

{fng_text}
{vix_text}
---
### 기업 정보
{profile_text}

### 전략 백테스트 성과 ({strategy_name})
{result_text}
---

위 데이터를 기반으로 {ticker} 종목에 대한 종합 투자 분석 리포트를 한국어 마크다운으로 작성하라.

포함 항목:
1. **투자 판단 및 근거** (강력매수/매수/보유/매도/강력매도)
2. **시장 환경 및 변동성 분석** (FNG, VIX 해석)
3. **핵심 전략 인사이트 및 추천**
4. **리스크 요인 및 유의사항**
5. **종합 투자 조언**

마크다운 형식: ## 제목, ### 소제목, **볼드**, - 리스트
간결하면서 실질적 가치를 제공하는 전문 리포트로 작성하라."""

    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        import traceback
        traceback.print_exc()
        return None


# ── helper: Fear & Greed index ────────────────────────
def _fetch_fng() -> str:
    try:
        from fear_and_greed import get as get_fng
        d = get_fng()
        return f"[탐욕공포지수] value: {d.value}, description: {d.description}, last_update: {d.last_update.date()}"
    except Exception:
        return "[탐욕공포지수 데이터 없음]"


def _fetch_vix() -> str:
    try:
        import yfinance as yf
        vix = yf.Ticker("^VIX")
        today = datetime.date.today().strftime("%Y-%m-%d")
        yesterday = (datetime.date.today() - datetime.timedelta(days=2)).strftime("%Y-%m-%d")
        hist = vix.history(start=yesterday, end=today)
        if not hist.empty:
            val = round(float(hist["Close"].iloc[-1]), 2)
            return f"[VIX 변동성지수] value: {val}"
    except Exception:
        pass
    return "[VIX 데이터 없음]"


def _fetch_profile(ticker: str) -> str:
    fmp_key = os.getenv("FMP_API_KEY", "")
    if not fmp_key:
        return "기업 프로필 데이터 없음 (FMP_API_KEY 미설정)"
    try:
        import requests
        url = f"https://financialmodelingprep.com/api/v3/profile/{ticker}?apikey={fmp_key}"
        resp = requests.get(url, timeout=5)
        data = resp.json()
        if data and isinstance(data, list):
            p = data[0]
            return (
                f"Beta: {p.get('beta', 'N/A')}\n"
                f"Average Volume: {p.get('volAvg', 'N/A')}\n"
                f"Market Cap: {p.get('mktCap', 'N/A')}\n"
                f"52-Week Range: {p.get('range', 'N/A')}\n"
                f"DCF Value: {p.get('dcf', 'N/A')}"
            )
    except Exception:
        pass
    return "기업 프로필 데이터 조회 실패"
