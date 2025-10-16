from fastapi import APIRouter, FastAPI

from ..config import AgentRelaySettings
from .status import router as status_router


def register_routes(app: FastAPI, settings: AgentRelaySettings) -> None:
    api_router = APIRouter()
    api_router.include_router(status_router, prefix="/status", tags=["status"])

    app.dependency_overrides.setdefault(AgentRelaySettings, lambda: settings)
    app.include_router(api_router)
