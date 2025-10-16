from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from ..config import AgentRelaySettings
from ..services.settings_store import SettingsStore

router = APIRouter()


class ServiceStatusResponse(BaseModel):
    service: str = Field(default="agentrelay")
    version: str
    protocolVersion: str
    agentsEtag: str
    maxConcurrentRuns: int
    startedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)


def get_settings_store(request: Request) -> SettingsStore:
    store: SettingsStore | None = getattr(request.app.state, "settings_store", None)
    if not store:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Settings store not initialised")
    return store


@router.get("", response_model=ServiceStatusResponse)
async def get_status(
    settings: AgentRelaySettings = Depends(),
    store: SettingsStore = Depends(get_settings_store),
) -> ServiceStatusResponse:
    deepseek_settings = store.get_deepseek_settings(settings.deepseek_api_base)

    return ServiceStatusResponse(
        service=settings.service_name,
        version=settings.service_version,
        protocolVersion=settings.protocol_version,
        agentsEtag=settings.agents_etag,
        maxConcurrentRuns=settings.max_concurrent_runs,
        metadata={
            "offlineMode": settings.offline_mode,
            "deepseek": {
                "apiKeySet": bool(deepseek_settings.get("apiKey")),
                "model": settings.deepseek_model,
                "baseUrl": deepseek_settings.get("baseUrl") or settings.deepseek_api_base,
            },
        },
    )
