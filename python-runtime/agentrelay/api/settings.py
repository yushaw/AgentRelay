from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from ..services.settings_store import SettingsStore

router = APIRouter(prefix="/settings", tags=["settings"])


def get_settings_store(request: Request) -> SettingsStore:
    store: SettingsStore | None = getattr(request.app.state, "settings_store", None)
    if not store:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Settings store not initialised")
    return store


class DeepSeekSettingsPayload(BaseModel):
    apiKey: str | None


class DeepSeekSettingsResponse(BaseModel):
    apiKeySet: bool
    apiKey: str | None = None


@router.get("/deepseek", response_model=DeepSeekSettingsResponse)
async def get_deepseek_settings(store: SettingsStore = Depends(get_settings_store)) -> DeepSeekSettingsResponse:
    key = store.get_deepseek_api_key()
    return DeepSeekSettingsResponse(apiKeySet=key is not None, apiKey=key)


@router.post("/deepseek", response_model=DeepSeekSettingsResponse)
async def set_deepseek_settings(
    payload: DeepSeekSettingsPayload,
    store: SettingsStore = Depends(get_settings_store),
) -> DeepSeekSettingsResponse:
    store.set_deepseek_api_key(payload.apiKey)
    key = store.get_deepseek_api_key()
    return DeepSeekSettingsResponse(apiKeySet=key is not None, apiKey=key)


@router.delete("/deepseek", response_model=DeepSeekSettingsResponse)
async def reset_deepseek_settings(store: SettingsStore = Depends(get_settings_store)) -> DeepSeekSettingsResponse:
    store.set_deepseek_api_key(None)
    return DeepSeekSettingsResponse(apiKeySet=False, apiKey=None)
