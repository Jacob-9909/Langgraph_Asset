"""FastAPI application — Wealth Advisor Web UI."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .database import Base, engine
from .routers import admin, agent, assets, auth, dashboard, profile

_HERE = Path(__file__).parent

app = FastAPI(title="Wealth Advisor", version="0.1.0")

# ── Create tables ──────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Routers ────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(profile.router)
app.include_router(assets.router)
app.include_router(agent.router)
app.include_router(dashboard.router)

# ── Static & Templates ─────────────────────────────────
app.mount("/static", StaticFiles(directory=str(_HERE / "static")), name="static")
templates = Jinja2Templates(directory=str(_HERE / "templates"))


@app.get("/", response_class=HTMLResponse)
@app.get("/login", response_class=HTMLResponse)
@app.get("/register", response_class=HTMLResponse)
@app.get("/dashboard", response_class=HTMLResponse)
def spa(request: Request):
    """Serve the single-page app shell for all frontend routes."""
    return templates.TemplateResponse(name="index.html", request=request)
