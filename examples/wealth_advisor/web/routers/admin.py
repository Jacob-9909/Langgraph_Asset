"""Admin routes: user approval management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import User
from ..schemas import PendingUserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/pending", response_model=list[PendingUserResponse])
def list_pending_users(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(
        select(User).where(User.is_approved == False).order_by(User.created_at.desc())  # noqa: E712
    ).all()
    return [PendingUserResponse.model_validate(u) for u in users]


@router.post("/approve/{user_id}", status_code=200)
def approve_user(
    user_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    if user.is_approved:
        return {"message": "이미 승인된 사용자입니다"}
    user.is_approved = True
    db.commit()
    return {"message": f"{user.name} ({user.email}) 승인 완료"}


@router.delete("/reject/{user_id}", status_code=200)
def reject_user(
    user_id: int,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="관리자는 삭제할 수 없습니다")
    db.delete(user)
    db.commit()
    return {"message": f"{user.name} ({user.email}) 가입 거부 및 삭제 완료"}
