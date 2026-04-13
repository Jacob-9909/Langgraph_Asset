"""User asset CRUD routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User, UserAsset
from ..schemas import AssetCreate, AssetResponse

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", response_model=list[AssetResponse])
def list_assets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [AssetResponse.model_validate(a) for a in user.assets]


@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(
    body: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = UserAsset(user_id=user.id, **body.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    body: AssetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.get(UserAsset, asset_id)
    if not asset or asset.user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, value in body.model_dump().items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.get(UserAsset, asset_id)
    if not asset or asset.user_id != user.id:
        raise HTTPException(status_code=404, detail="Asset not found")
    db.delete(asset)
    db.commit()
