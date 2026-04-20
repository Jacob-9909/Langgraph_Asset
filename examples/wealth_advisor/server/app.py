"""FastAPI application — Wealth Advisor API server."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .database import Base, engine
from .routers import admin, agent, assets, auth, backtest, cheongyak, dashboard, profile

_HERE = Path(__file__).parent
_DIST = _HERE.parent / "frontend" / "dist"

app = FastAPI(title="Wealth Advisor", version="0.1.0")

# ── CORS (dev: React Vite on :3000) ──────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limit error handler ──────────────────────────
app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Create tables ──────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routers ────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(assets.router)
app.include_router(agent.router)
app.include_router(dashboard.router)
app.include_router(backtest.router)
app.include_router(cheongyak.router)

# ── Production: serve React build ──────────────────────
if _DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(_DIST / "assets")), name="vite-assets")
    if (_DIST / "images").exists():
        app.mount("/images", StaticFiles(directory=str(_DIST / "images")), name="images")

    @app.get("/{path:path}", response_class=HTMLResponse)
    def spa_fallback(request: Request, path: str):
        """Serve React SPA for all non-API routes."""
        return HTMLResponse((_DIST / "index.html").read_text())
