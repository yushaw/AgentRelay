from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import register_routes
from .config import AgentRelaySettings
from .services.run_manager import RunManager
from .services.settings_store import SettingsStore


def create_app(settings: AgentRelaySettings | None = None) -> FastAPI:
    resolved_settings = settings or AgentRelaySettings()
    app = FastAPI(
        title="AgentRelay Service",
        version=resolved_settings.service_version,
        docs_url=None,
        redoc_url=None,
        openapi_url="/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] ,
        allow_methods=["*"] ,
        allow_headers=["*"] ,
    )

    settings_store = SettingsStore(app_name="AgentRelay", app_author="AgentRelay")
    run_manager = RunManager(resolved_settings, settings_store)
    app.state.settings_store = settings_store
    app.state.run_manager = run_manager

    register_routes(app, resolved_settings)

    @app.on_event("startup")
    async def _announce_ready() -> None:
        print(f"AGENTRELAY READY {resolved_settings.port}", flush=True)

    return app
