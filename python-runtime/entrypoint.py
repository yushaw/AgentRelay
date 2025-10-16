from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any

import uvicorn

from agentrelay import create_app
from agentrelay.config import AgentRelaySettings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="AgentRelay LangGraph runtime")
    parser.add_argument("--host", help="Bind host for HTTP server")
    parser.add_argument("--port", type=int, help="Bind port for HTTP server")
    parser.add_argument("--log-level", default=None, help="Logging level for Uvicorn")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Enable offline mode (blocks outbound HTTP requests).",
    )
    parser.add_argument(
        "--allow-guest",
        action="store_true",
        help="Allow unauthenticated requests (development only).",
    )
    parser.add_argument(
        "--service-version",
        help="Override reported service version string.",
    )
    parser.add_argument(
        "--protocol-version",
        help="Override reported protocol version string.",
    )
    return parser.parse_args()


def build_settings(args: argparse.Namespace) -> AgentRelaySettings:
    overrides: dict[str, Any] = {}
    if args.host:
        overrides["host"] = args.host
    if args.port:
        overrides["port"] = args.port
    if args.log_level:
        overrides["log_level"] = args.log_level
    if args.offline:
        overrides["offline_mode"] = True
    if args.allow_guest:
        overrides["allow_guest_requests"] = True
    if args.service_version:
        overrides["service_version"] = args.service_version
    if args.protocol_version:
        overrides["protocol_version"] = args.protocol_version
    return AgentRelaySettings(**overrides)


async def run_uvicorn(settings: AgentRelaySettings) -> None:
    app = create_app(settings)
    config = uvicorn.Config(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level.lower(),
        proxy_headers=False,
        reload=False,
    )
    server = uvicorn.Server(config=config)
    await server.serve()


def main() -> None:
    args = parse_args()
    settings = build_settings(args)

    logging.basicConfig(level=settings.log_level)

    try:
        asyncio.run(run_uvicorn(settings))
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
