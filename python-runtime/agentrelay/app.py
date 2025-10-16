from fastapi import FastAPI

from .api.routes import register_routes
from .config import AgentRelaySettings


def create_app(settings: AgentRelaySettings | None = None) -> FastAPI:
    resolved_settings = settings or AgentRelaySettings()
    app = FastAPI(
        title="AgentRelay Service",
        version=resolved_settings.service_version,
        docs_url=None,
        redoc_url=None,
        openapi_url="/openapi.json",
    )

    register_routes(app, resolved_settings)

    @app.on_event("startup")
    async def _announce_ready() -> None:
        print(f"AGENTRELAY READY {resolved_settings.port}", flush=True)

    return app
