"""체험 계정 및 샘플 데이터 시드.

Usage:
    uv run python scripts/seed_demo.py

멱등: 이미 존재하면 건드리지 않음.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")

from sqlalchemy import select
from sqlalchemy.orm import Session

from wealth_advisor.api.auth import hash_password
from wealth_advisor.db.models import Base, User, UserAsset, UserProfile
from wealth_advisor.db.session import engine

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"
DEMO_NAME = "체험 계정"

SAMPLE_ASSETS = [
    dict(asset_type="deposit",  asset_name="KB국민은행 정기예금",      amount_krw=10_000_000, interest_rate=3.50, maturity_date="2026-03-31"),
    dict(asset_type="savings",  asset_name="카카오뱅크 자유적금",       amount_krw=2_400_000,  interest_rate=4.00, start_date="2025-01-01", maturity_date="2026-01-01"),
    dict(asset_type="stock",    asset_name="삼성전자",                  amount_krw=7_800_000,  quantity=120,  buy_price_krw=62_000,  current_price_krw=65_000),
    dict(asset_type="stock",    asset_name="KODEX 200 ETF",            amount_krw=3_000_000,  quantity=80,   buy_price_krw=35_500,  current_price_krw=37_500),
    dict(asset_type="pension",  asset_name="연금저축펀드 (미래에셋)",   amount_krw=5_500_000),
    dict(asset_type="cash",     asset_name="토스 CMA",                  amount_krw=1_800_000),
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if existing:
            print(f"  [seed] 체험 계정이 이미 존재합니다 ({DEMO_EMAIL})")
            return

        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            name=DEMO_NAME,
            is_approved=True,
            is_admin=False,
        )
        db.add(user)
        db.flush()  # user.id 확보

        profile = UserProfile(
            user_id=user.id,
            age_band="30대 초반",
            employment_type="employee",
            annual_income_band="35m_to_70m",
            monthly_surplus_krw=500_000,
            horizon_months=24,
            risk_tolerance="mid",
            goal="결혼 자금 마련 및 노후 대비 적립식 투자",
            tax_wrappers_note="연금저축 납입 중, IRP 미가입",
        )
        db.add(profile)

        for a in SAMPLE_ASSETS:
            db.add(UserAsset(user_id=user.id, **a))

        db.commit()
        print(f"  [seed] 체험 계정 생성 완료")
        print(f"         이메일   : {DEMO_EMAIL}")
        print(f"         비밀번호 : {DEMO_PASSWORD}")


if __name__ == "__main__":
    seed()
