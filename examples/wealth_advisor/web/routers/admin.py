"""Admin routes: user management & system overview."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import User, UserAsset
from ..schemas import AdminStatsResponse, AdminUserResponse, PendingUserResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count(User.id))) or 0
    approved = db.scalar(select(func.count(User.id)).where(User.is_approved == True)) or 0  # noqa: E712
    pending = total - approved
    total_assets = db.scalar(select(func.coalesce(func.sum(UserAsset.amount_krw), 0))) or 0
    return AdminStatsResponse(
        total_users=total,
        approved_users=approved,
        pending_users=pending,
        total_assets_all_krw=total_assets,
    )


@router.get("/users", response_model=list[AdminUserResponse])
def list_all_users(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.scalars(select(User).order_by(User.created_at.desc())).all()
    result = []
    for u in users:
        asset_count = len(u.assets)
        total = sum(a.amount_krw for a in u.assets)
        result.append(AdminUserResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            is_approved=u.is_approved,
            is_admin=u.is_admin,
            asset_count=asset_count,
            total_assets_krw=total,
            created_at=u.created_at,
        ))
    return result


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
    return {"message": f"{user.name} ({user.email}) 삭제 완료"}
