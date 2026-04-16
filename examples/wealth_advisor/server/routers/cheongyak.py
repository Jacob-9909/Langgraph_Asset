"""청약 정보 API routes."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_current_user
from ..models import User

router = APIRouter(prefix="/api/cheongyak", tags=["cheongyak"])


@router.get("/apt")
async def list_apt(
    user: User = Depends(get_current_user),
    days_back: int = Query(60, ge=1, le=365),
    days_forward: int = Query(60, ge=1, le=365),
):
    """최근 APT 분양 공고 목록."""
    from ...cheongyak.api_client import fetch_recent_apt

    try:
        results = await asyncio.to_thread(fetch_recent_apt, days_back, days_forward)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/officetel")
async def list_officetel(
    user: User = Depends(get_current_user),
    days_back: int = Query(60, ge=1, le=365),
    days_forward: int = Query(60, ge=1, le=365),
):
    """오피스텔/도시형/민간임대 분양 공고 목록."""
    from ...cheongyak.api_client import fetch_officetel

    try:
        results = await asyncio.to_thread(fetch_officetel, days_back, days_forward)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/remaining")
async def list_remaining(
    user: User = Depends(get_current_user),
    days_back: int = Query(60, ge=1, le=365),
    days_forward: int = Query(60, ge=1, le=365),
):
    """APT 무순위/잔여세대 분양 공고 목록."""
    from ...cheongyak.api_client import fetch_remaining_apt

    try:
        results = await asyncio.to_thread(fetch_remaining_apt, days_back, days_forward)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/opt")
async def list_opt(
    user: User = Depends(get_current_user),
    days_back: int = Query(60, ge=1, le=365),
    days_forward: int = Query(60, ge=1, le=365),
):
    """임의공급 분양 공고 목록."""
    from ...cheongyak.api_client import fetch_opt_supply

    try:
        results = await asyncio.to_thread(fetch_opt_supply, days_back, days_forward)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/public-rent")
async def list_public_rent(
    user: User = Depends(get_current_user),
    days_back: int = Query(60, ge=1, le=365),
    days_forward: int = Query(60, ge=1, le=365),
):
    """공공지원 민간임대 분양 공고 목록."""
    from ...cheongyak.api_client import fetch_public_rent

    try:
        results = await asyncio.to_thread(fetch_public_rent, days_back, days_forward)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/apt/{house_manage_no}/{pblanc_no}/types")
async def apt_housing_types(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """특정 공고 주택형별 상세."""
    from ...cheongyak.api_client import fetch_apt_housing_types

    try:
        results = await asyncio.to_thread(fetch_apt_housing_types, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"공공데이터 API 호출 실패: {e}")
    return results


@router.get("/apt/{house_manage_no}/{pblanc_no}/competition")
async def apt_competition(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """특정 공고 경쟁률 조회."""
    from ...cheongyak.api_client import fetch_apt_competition

    try:
        results = await asyncio.to_thread(fetch_apt_competition, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경쟁률 API 호출 실패: {e}")
    return results


@router.get("/apt/{house_manage_no}/{pblanc_no}/scores")
async def apt_scores(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """특정 공고 당첨 가점 조회."""
    from ...cheongyak.api_client import fetch_apt_scores

    try:
        results = await asyncio.to_thread(fetch_apt_scores, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"가점 API 호출 실패: {e}")
    return results


@router.get("/apt/{house_manage_no}/{pblanc_no}/special-supply")
async def apt_special_supply(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """특정 공고 특별공급 신청현황 조회."""
    from ...cheongyak.api_client import fetch_apt_special_supply

    try:
        results = await asyncio.to_thread(fetch_apt_special_supply, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"특별공급 API 호출 실패: {e}")
    return results


@router.get("/officetel/{house_manage_no}/{pblanc_no}/competition")
async def officetel_competition(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """오피스텔/도시형/민간임대 경쟁률 조회."""
    from ...cheongyak.api_client import fetch_officetel_competition

    try:
        results = await asyncio.to_thread(fetch_officetel_competition, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경쟁률 API 호출 실패: {e}")
    return results


@router.get("/public-rent/{house_manage_no}/{pblanc_no}/competition")
async def public_rent_competition(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """공공지원 민간임대 경쟁률 조회."""
    from ...cheongyak.api_client import fetch_public_rent_competition

    try:
        results = await asyncio.to_thread(fetch_public_rent_competition, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경쟁률 API 호출 실패: {e}")
    return results


@router.get("/opt/{house_manage_no}/{pblanc_no}/competition")
async def opt_competition(
    house_manage_no: str,
    pblanc_no: str,
    user: User = Depends(get_current_user),
):
    """임의공급 경쟁률 조회."""
    from ...cheongyak.api_client import fetch_opt_competition

    try:
        results = await asyncio.to_thread(fetch_opt_competition, house_manage_no, pblanc_no)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"경쟁률 API 호출 실패: {e}")
    return results
