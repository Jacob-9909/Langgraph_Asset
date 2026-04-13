"""Pydantic request / response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


# ── Profile ───────────────────────────────────────────

class ProfileUpdate(BaseModel):
    age_band: str | None = None
    monthly_surplus_krw: int | None = None
    horizon_months: int | None = None
    risk_tolerance: str | None = None
    goal: str | None = None
    employment_type: str | None = None
    annual_income_band: str | None = None
    tax_wrappers_note: str | None = None


class ProfileResponse(ProfileUpdate):
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Assets ────────────────────────────────────────────

class AssetCreate(BaseModel):
    asset_type: str
    asset_name: str
    amount_krw: int
    interest_rate: float | None = None
    start_date: str | None = None
    maturity_date: str | None = None
    notes: str | None = None


class AssetResponse(AssetCreate):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Agent ─────────────────────────────────────────────

class AgentResultResponse(BaseModel):
    id: int
    recommendation: str | None
    market_notes: str | None
    macro_market_notes: str | None
    tax_market_notes: str | None
    executed_at: datetime

    model_config = {"from_attributes": True}


# ── Dashboard ─────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_assets_krw: int
    asset_count: int
    assets_by_type: dict[str, int]
    assets: list[AssetResponse] = []
    profile: ProfileResponse | None
    recent_recommendation: AgentResultResponse | None
