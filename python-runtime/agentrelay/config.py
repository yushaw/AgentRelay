from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentRelaySettings(BaseSettings):
    host: str = Field(default="127.0.0.1", description="Loopback interface for HTTP service")
    port: int = Field(default=51055, ge=1, le=65535)
    service_name: str = Field(default="agentrelay")
    service_version: str = Field(default="0.1.0-dev")
    protocol_version: str = Field(default="1.0")
    max_concurrent_runs: int = Field(default=1, ge=1)
    agents_etag: str = Field(default="bootstrap")
    tokens_file: Path = Field(default=Path("tokens.json"))
    allow_guest_requests: bool = Field(
        default=False,
        description="Allow unauthenticated requests when true; intended for development only.",
    )
    offline_mode: bool = Field(
        default=False,
        description="When enabled, blocks outbound network calls (enforced by middleware).",
    )
    log_level: str = Field(default="INFO")
    python_executable: Optional[Path] = Field(
        default=None,
        description="Optional override for embedded Python interpreter paths.",
    )

    model_config = SettingsConfigDict(env_prefix="AGENTRELAY_", env_file=".env", extra="ignore")
