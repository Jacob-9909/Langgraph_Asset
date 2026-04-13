"""JWT authentication helpers."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "wealth-advisor-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(plain: str) -> str: # PBKDF2-SHA256, salt + hash
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 260_000).hex()
    return f"{salt}${h}"


def verify_password(plain: str, stored: str) -> bool:
    salt, h = stored.split("$", 1)          # DB에서 salt와 hash 분리
    candidate = hashlib.pbkdf2_hmac(        # 입력한 비밀번호를 같은 방식으로 해싱
        "sha256", plain.encode(), salt.encode(), 260_000
    ).hex()
    return hmac.compare_digest(candidate, h) # 안전하게 비교



def create_access_token(user_id: int) -> str: # JWT 생성
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


def get_current_user(
    token: str = Depends(oauth2_scheme),  # Request Header에서 Bearer 토큰 자동 추출
    db: Session = Depends(get_db),        # DB 세션 자동 주입
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])  # JWT 디코딩
        user_id = int(payload["sub"])     # "sub" 클레임에서 user_id 추출
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Invalid token")  # 토큰 위/변조 or 만료 시
    
    user = db.get(User, user_id)          # DB에서 유저 조회
    if user is None:
        raise HTTPException(401, "User not found")  # 탈퇴한 유저 등
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="관리자 권한이 필요합니다")
    return user
