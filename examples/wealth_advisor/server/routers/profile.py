"""User financial profile routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, UserProfile
from ..schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.profile is None:
        return ProfileResponse()
    return ProfileResponse.model_validate(user.profile)


@router.put("", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.profile is None:
        profile = UserProfile(user_id=user.id, **body.model_dump(exclude_none=True))
        db.add(profile)
    else:
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(user.profile, field, value)
    db.commit()
    db.refresh(user)
    return ProfileResponse.model_validate(user.profile)
