from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..config import AgentRelaySettings

router = APIRouter()


class ServiceStatusResponse(BaseModel):
    service: str = Field(default="agentrelay")
    version: str
    protocolVersion: str
    agentsEtag: str
    maxConcurrentRuns: int
    startedAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.get("", response_model=ServiceStatusResponse)
async def get_status(settings: AgentRelaySettings = Depends()) -> ServiceStatusResponse:
    return ServiceStatusResponse(
        service=settings.service_name,
        version=settings.service_version,
        protocolVersion=settings.protocol_version,
        agentsEtag=settings.agents_etag,
        maxConcurrentRuns=settings.max_concurrent_runs,
        metadata={"offlineMode": settings.offline_mode},
    )
