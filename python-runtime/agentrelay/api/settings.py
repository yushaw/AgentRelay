from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from ..config import AgentRelaySettings
from ..services.settings_store import SettingsStore

router = APIRouter(prefix="/settings", tags=["settings"])


def get_settings_store(request: Request) -> SettingsStore:
    store: SettingsStore | None = getattr(request.app.state, "settings_store", None)
    if not store:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Settings store not initialised")
    return store


class DeepSeekSettingsPayload(BaseModel):
    apiKey: str | None = None
    baseUrl: str | None = None


class DeepSeekSettingsResponse(BaseModel):
    apiKeySet: bool
    apiKey: str | None = None
    baseUrl: str


@router.get("/deepseek", response_model=DeepSeekSettingsResponse)
async def get_deepseek_settings(
    settings: AgentRelaySettings = Depends(),
    store: SettingsStore = Depends(get_settings_store),
) -> DeepSeekSettingsResponse:
    resolved = store.get_deepseek_settings(default_base=settings.deepseek_api_base)
    return DeepSeekSettingsResponse(
        apiKeySet=bool(resolved.get("apiKey")),
        apiKey=resolved.get("apiKey"),
        baseUrl=resolved.get("baseUrl") or settings.deepseek_api_base,
    )


@router.post("/deepseek", response_model=DeepSeekSettingsResponse)
async def set_deepseek_settings(
    payload: DeepSeekSettingsPayload,
    settings: AgentRelaySettings = Depends(),
    store: SettingsStore = Depends(get_settings_store),
) -> DeepSeekSettingsResponse:
    store.set_deepseek_settings(payload.apiKey, payload.baseUrl)
    resolved = store.get_deepseek_settings(default_base=settings.deepseek_api_base)
    return DeepSeekSettingsResponse(
        apiKeySet=bool(resolved.get("apiKey")),
        apiKey=resolved.get("apiKey"),
        baseUrl=resolved.get("baseUrl") or settings.deepseek_api_base,
    )


@router.delete("/deepseek", response_model=DeepSeekSettingsResponse)
async def reset_deepseek_settings(
    settings: AgentRelaySettings = Depends(),
    store: SettingsStore = Depends(get_settings_store),
) -> DeepSeekSettingsResponse:
    store.set_deepseek_settings(None, settings.deepseek_api_base)
    return DeepSeekSettingsResponse(apiKeySet=False, apiKey=None, baseUrl=settings.deepseek_api_base)
