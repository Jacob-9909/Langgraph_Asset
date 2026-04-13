"""Dashboard summary route."""

from __future__ import annotations

from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import (
    AgentResultResponse,
    AssetResponse,
    DashboardSummary,
    ProfileResponse,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def get_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assets = user.assets
    total = sum(a.amount_krw for a in assets)
    by_type: dict[str, int] = defaultdict(int)
    for a in assets:
        by_type[a.asset_type] += a.amount_krw

    profile_resp = (
        ProfileResponse.model_validate(user.profile) if user.profile else None
    )
    recent = (
        AgentResultResponse.model_validate(user.agent_results[0])
        if user.agent_results
        else None
    )

    return DashboardSummary(
        total_assets_krw=total,
        asset_count=len(assets),
        assets_by_type=dict(by_type),
        assets=[AssetResponse.model_validate(a) for a in assets],
        profile=profile_resp,
        recent_recommendation=recent,
    )
