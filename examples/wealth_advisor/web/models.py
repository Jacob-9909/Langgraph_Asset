"""SQLAlchemy ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship # sqlalchemy 2.0 부터 도입된 Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "wa_users"

    id: Mapped[int] = mapped_column(primary_key=True) # DB 컬럼의 실제 옵션
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_approved: Mapped[bool] = mapped_column(Boolean, server_default="false") # 기본값 db가 처리
    is_admin: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # relationship: 연관관계 설정 
    profile: Mapped[UserProfile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    assets: Mapped[list[UserAsset]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    agent_results: Mapped[list[AgentResult]] = relationship( # 1 : N
        back_populates="user", cascade="all, delete-orphan", order_by="AgentResult.executed_at.desc()"
    )
    backtest_results: Mapped[list[BacktestResult]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="BacktestResult.executed_at.desc()"
    )


class UserProfile(Base):
    __tablename__ = "wa_user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("wa_users.id", ondelete="CASCADE"), unique=True
    )
    age_band: Mapped[str | None] = mapped_column(String(50))
    monthly_surplus_krw: Mapped[int | None] = mapped_column(BigInteger)
    horizon_months: Mapped[int | None]
    risk_tolerance: Mapped[str | None] = mapped_column(String(10))
    goal: Mapped[str | None] = mapped_column(Text)
    employment_type: Mapped[str | None] = mapped_column(String(50))
    annual_income_band: Mapped[str | None] = mapped_column(String(50))
    tax_wrappers_note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="profile")


class UserAsset(Base):
    __tablename__ = "wa_user_assets"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("wa_users.id", ondelete="CASCADE")
    )
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    asset_name: Mapped[str] = mapped_column(String(200), nullable=False)
    amount_krw: Mapped[int] = mapped_column(BigInteger, nullable=False)
    interest_rate: Mapped[float | None] = mapped_column(Numeric(5, 2))
    quantity: Mapped[float | None] = mapped_column(Numeric(18, 8))
    buy_price_krw: Mapped[int | None] = mapped_column(BigInteger)
    current_price_krw: Mapped[int | None] = mapped_column(BigInteger)
    start_date: Mapped[str | None] = mapped_column(String(10))
    maturity_date: Mapped[str | None] = mapped_column(String(10))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="assets")


class AgentResult(Base):
    __tablename__ = "wa_agent_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("wa_users.id", ondelete="CASCADE")
    )
    market_notes: Mapped[str | None] = mapped_column(Text)
    macro_market_notes: Mapped[str | None] = mapped_column(Text)
    tax_market_notes: Mapped[str | None] = mapped_column(Text)
    recommendation: Mapped[str | None] = mapped_column(Text)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="agent_results")


class BacktestResult(Base):
    __tablename__ = "wa_backtest_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("wa_users.id", ondelete="CASCADE")
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    strategy: Mapped[str] = mapped_column(String(50), nullable=False)
    start_date: Mapped[str] = mapped_column(String(10), nullable=False)
    end_date: Mapped[str] = mapped_column(String(10), nullable=False)
    initial_capital: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_return: Mapped[float | None] = mapped_column(Numeric(10, 6))
    annual_return: Mapped[float | None] = mapped_column(Numeric(10, 6))
    max_drawdown: Mapped[float | None] = mapped_column(Numeric(10, 6))
    buy_hold_return: Mapped[float | None] = mapped_column(Numeric(10, 6))
    total_trades: Mapped[int | None]
    final_value: Mapped[int | None] = mapped_column(BigInteger)
    params_json: Mapped[str | None] = mapped_column(Text)
    ai_analysis: Mapped[str | None] = mapped_column(Text)
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="backtest_results")
