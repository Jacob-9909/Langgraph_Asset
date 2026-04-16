"""Backtest / Trading Lab API routes."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import BacktestResult, User
from ..schemas import (
    BacktestRequest,
    BacktestResponse,
    BacktestResultResponse,
    GridSearchRequest,
    GridSearchResponse,
    StrategyInfo,
)
from ...trading.stock_analyzer import DEFAULT_PARAMS, STRATEGY_LABELS, StockAnalyzer

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.get("/ticker-search")
async def ticker_search(q: str = ""):
    """Proxy Yahoo Finance ticker autocomplete."""
    if len(q.strip()) < 1:
        return []
    import requests as _req

    try:
        resp = _req.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": q.strip(), "quotesCount": 8, "newsCount": 0, "enableFuzzyQuery": False},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=4,
        )
        quotes = resp.json().get("quotes", [])
        return [
            {"symbol": r.get("symbol", ""), "name": r.get("shortname", ""), "exchange": r.get("exchDisp", "")}
            for r in quotes
            if r.get("symbol")
        ]
    except Exception:
        return []


# ── Strategy descriptions (static) ────────────────────
_STRATEGY_DESCS: dict[str, str] = {
    "sma_crossover": "단기/장기 이동평균선 교차 시 매매. 추세 추종 전략.",
    "macd": "MACD와 시그널 라인 교차 시 매매. 모멘텀 전략.",
    "rsi": "RSI가 과매도/과매수 임계값을 돌파할 때 매매. 역추세 전략.",
    "bollinger": "볼린저 밴드 상/하단 돌파 시 매매. 변동성 기반 전략.",
    "obv": "OBV와 이동평균 교차 시 매매. 거래량 기반 전략.",
    "combined": "5개 전략 중 3개 이상 동의 시 매매. 보수적 복합 전략.",
}


@router.get("/strategies", response_model=list[StrategyInfo])
def list_strategies():
    return [
        StrategyInfo(
            name=name,
            label=STRATEGY_LABELS.get(name, name),
            description=_STRATEGY_DESCS.get(name, ""),
            default_params=DEFAULT_PARAMS.get(name, {}),
        )
        for name in STRATEGY_LABELS
    ]


@router.post("/run", response_model=BacktestResponse)
async def run_backtest(
    body: BacktestRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    def _run():
        analyzer = StockAnalyzer(
            body.ticker, body.start_date, body.end_date, body.initial_capital
        )
        analyzer.fetch_data()
        return analyzer.backtest(body.strategy)

    try:
        result = await asyncio.to_thread(_run)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    metrics = result["metrics"]
    row = BacktestResult(
        user_id=user.id,
        ticker=result["ticker"],
        strategy=result["strategy"],
        start_date=body.start_date,
        end_date=body.end_date,
        initial_capital=body.initial_capital,
        total_return=metrics["total_return"],
        annual_return=metrics["annual_return"],
        max_drawdown=metrics["max_drawdown"],
        buy_hold_return=metrics["buy_hold_return"],
        total_trades=metrics["total_trades"],
        final_value=metrics["final_value"],
        params_json=json.dumps(result.get("params_used", {})),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return BacktestResponse(
        metrics=metrics,
        chart_data=result["chart_data"],
        strategy=result["strategy"],
        ticker=result["ticker"],
        backtest_id=row.id,
    )


@router.post("/grid-search", response_model=GridSearchResponse)
async def grid_search(
    body: GridSearchRequest,
    user: User = Depends(get_current_user),
):
    if body.strategy == "combined":
        raise HTTPException(status_code=400, detail="복합 전략은 그리드 서치를 지원하지 않습니다")

    def _search():
        analyzer = StockAnalyzer(
            body.ticker, body.start_date, body.end_date, body.initial_capital
        )
        analyzer.fetch_data()
        return analyzer.grid_search(body.strategy)

    try:
        result = await asyncio.to_thread(_search)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return GridSearchResponse(**result)


@router.post("/grid-search-stream")
async def grid_search_stream(
    body: GridSearchRequest,
    user: User = Depends(get_current_user),
):
    """SSE endpoint — streams each grid search result as it's computed."""
    from fastapi.responses import StreamingResponse

    if body.strategy == "combined":
        raise HTTPException(status_code=400, detail="복합 전략은 그리드 서치를 지원하지 않습니다")

    def _prepare():
        analyzer = StockAnalyzer(
            body.ticker, body.start_date, body.end_date, body.initial_capital
        )
        analyzer.fetch_data()
        return analyzer

    try:
        analyzer = await asyncio.to_thread(_prepare)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    import queue
    import threading

    q: queue.Queue = queue.Queue()

    def _run():
        try:
            for item in analyzer.grid_search_stream(body.strategy):
                q.put(item)
        finally:
            q.put(None)  # sentinel

    threading.Thread(target=_run, daemon=True).start()

    async def event_stream():
        while True:
            item = await asyncio.to_thread(q.get)
            if item is None:
                yield f"event: done\ndata: {{}}\n\n"
                break
            yield f"data: {json.dumps(item, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/ai-analysis")
async def ai_analysis(
    body: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    backtest_id = body.get("backtest_id")
    if not backtest_id:
        raise HTTPException(status_code=400, detail="backtest_id가 필요합니다")

    row = db.get(BacktestResult, backtest_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="백테스트 결과를 찾을 수 없습니다")

    if row.ai_analysis:
        return {"analysis": row.ai_analysis}

    from ...trading.ai_analysis import generate_analysis

    metrics = {
        "total_return": float(row.total_return or 0),
        "buy_hold_return": float(row.buy_hold_return or 0),
        "annual_return": float(row.annual_return or 0),
        "max_drawdown": float(row.max_drawdown or 0),
        "total_trades": row.total_trades or 0,
        "final_value": row.final_value or 0,
    }
    analysis = await generate_analysis(row.ticker, row.strategy, metrics)
    if not analysis:
        raise HTTPException(status_code=502, detail="AI 분석 생성에 실패했습니다")

    row.ai_analysis = analysis
    db.commit()
    return {"analysis": analysis}


@router.get("/history", response_model=list[BacktestResultResponse])
def backtest_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return user.backtest_results


@router.delete("/history/{result_id}", status_code=204)
def delete_backtest(
    result_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.get(BacktestResult, result_id)
    if not row or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="결과를 찾을 수 없습니다")
    db.delete(row)
    db.commit()
