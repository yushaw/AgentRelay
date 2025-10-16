from fastapi import APIRouter, FastAPI

from ..config import AgentRelaySettings
from .runs import router as runs_router
from .settings import router as settings_router
from .status import router as status_router


def register_routes(app: FastAPI, settings: AgentRelaySettings) -> None:
    api_router = APIRouter()
    api_router.include_router(status_router, prefix="/status", tags=["status"])
    api_router.include_router(settings_router)
    api_router.include_router(runs_router)

    app.dependency_overrides.setdefault(AgentRelaySettings, lambda: settings)
    app.include_router(api_router)
