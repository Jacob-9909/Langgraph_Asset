"""SQLAlchemy ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "wa_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    profile: Mapped[UserProfile | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    assets: Mapped[list[UserAsset]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    agent_results: Mapped[list[AgentResult]] = relationship(
        back_populates="user", cascade="all, delete-orphan", order_by="AgentResult.executed_at.desc()"
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
