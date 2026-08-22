from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user_id

from app.services.twin_service import (
    build_twin,
    simulate_mutation,
    compare_twins,
    optimize_remediation,
    _TWIN_CACHE
)

router = APIRouter()


class TwinBuildRequest(BaseModel):
    scan_id: str


class TwinSimulateRequest(BaseModel):
    mutation_type: str


class TwinCompareRequest(BaseModel):
    twin_id_after: str


@router.post("/build")
async def api_build_twin(
    request: TwinBuildRequest,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    twin = build_twin(request.scan_id, user_id=user_id)
    if not twin:
        raise HTTPException(status_code=404, detail="Scan not found or Twin could not be built.")
    # Return twin omitting raw string content if it's too large, but for now return all
    return twin


@router.get("/{twin_id}")
async def api_get_twin(
    twin_id: str,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    # First try from cache (might be simulated twin)
    twin = _TWIN_CACHE.get(twin_id)
    if not twin:
        # Try to build from scan_id
        twin = build_twin(twin_id, user_id=user_id)
        if not twin:
            raise HTTPException(status_code=404, detail="Twin not found.")
    return twin


@router.get("/{twin_id}/attack-paths")
async def api_get_attack_paths(
    twin_id: str,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    twin = _TWIN_CACHE.get(twin_id)
    if not twin:
        twin = build_twin(twin_id, user_id=user_id)
        if not twin:
            raise HTTPException(status_code=404, detail="Twin not found.")
    
    paths = twin["graph"].get("critical_attack_paths", [])
    return {"attack_paths": paths, "count": len(paths)}


@router.post("/{twin_id}/simulate")
async def api_simulate(
    twin_id: str,
    request: TwinSimulateRequest,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    try:
        sim_twin = simulate_mutation(twin_id, request.mutation_type, user_id=user_id)
        return sim_twin
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{twin_id}/compare")
async def api_compare(
    twin_id: str,
    request: TwinCompareRequest,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    twin_before = _TWIN_CACHE.get(twin_id) or build_twin(twin_id, user_id=user_id)
    twin_after = _TWIN_CACHE.get(request.twin_id_after)
    
    if not twin_before or not twin_after:
        raise HTTPException(status_code=404, detail="One or both twins not found.")
        
    return compare_twins(twin_before, twin_after)


@router.post("/{twin_id}/optimize")
async def api_optimize(
    twin_id: str,
    user_id: str = Depends(get_current_user_id)
) -> dict[str, object]:
    try:
        res = optimize_remediation(twin_id, user_id=user_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

