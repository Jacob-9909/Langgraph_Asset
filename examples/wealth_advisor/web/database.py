"""Database engine & session factory."""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:8350@127.0.0.1:5433/langgraph",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True) # 연결 끊김 감지 및 자동 복구
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False) # 세션 팩토리


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
