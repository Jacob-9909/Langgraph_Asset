"""Authentication routes: register & login."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import ADMIN_EMAIL, create_access_token, hash_password, verify_password
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다")

    is_admin = bool(ADMIN_EMAIL and body.email.lower() == ADMIN_EMAIL.lower())
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        is_approved=is_admin,
        is_admin=is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if not user.is_approved:
        return {"status": "pending", "message": "가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다."}

    return TokenResponse(
        access_token=create_access_token(user.id),
        user_id=user.id,
        name=user.name,
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다",
        )
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 승인 대기 중입니다",
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        user_id=user.id,
        name=user.name,
    )
