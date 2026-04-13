"""Pydantic request / response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str


class PendingUserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_approved: bool
    is_admin: bool
    asset_count: int = 0
    total_assets_krw: int = 0
    created_at: datetime


class AdminStatsResponse(BaseModel):
    total_users: int
    approved_users: int
    pending_users: int
    total_assets_all_krw: int


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
    quantity: float | None = None
    buy_price_krw: int | None = None
    current_price_krw: int | None = None
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
    is_admin: bool = False
