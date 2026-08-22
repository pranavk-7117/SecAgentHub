from __future__ import annotations

import requests
from fastapi import Header, HTTPException

from app.core.config import get_settings
from app.repository import repository


def get_current_user_id(authorization: str | None = Header(None)) -> str:
    settings = get_settings()
    if not settings.supabase_url:
        fallback_uid = "00000000-0000-0000-0000-000000000000"
        repository.ensure_user(fallback_uid, "local-dev@example.com")
        return fallback_uid

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication credentials.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        url = f"{settings.supabase_url}/auth/v1/user"
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {token}",
        }
        res = requests.get(url, headers=headers, timeout=5)
        if res.status_code == 200:
            user_data = res.json()
            uid = user_data.get("id")
            email = user_data.get("email", "")
            if uid:
                repository.ensure_user(uid, email)
                return str(uid)
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Authentication validation failed: {str(exc)}")

    raise HTTPException(status_code=401, detail="Authentication token is expired or invalid.")
