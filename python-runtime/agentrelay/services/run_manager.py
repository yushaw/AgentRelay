from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi.encoders import jsonable_encoder
from openai import AsyncOpenAI

from ..config import AgentRelaySettings
from .settings_store import SettingsStore

logger = logging.getLogger(__name__)


class RunNotFoundError(Exception):
    pass


@dataclass
class RunContext:
    run_id: str
    queue: asyncio.Queue[Optional[dict[str, Any]]]
    task: Optional[asyncio.Task] = None
    cancel_event: asyncio.Event = field(default_factory=asyncio.Event)


class RunManager:
    def __init__(self, settings: AgentRelaySettings, settings_store: SettingsStore):
        self._settings = settings
        self._settings_store = settings_store
        self._runs: Dict[str, RunContext] = {}
        self._lock = asyncio.Lock()

    async def create_run(self, run_id: str, payload: dict[str, Any]) -> None:
        async with self._lock:
            if run_id in self._runs:
                raise ValueError("Run already exists")
            queue: asyncio.Queue[Optional[dict[str, Any]]] = asyncio.Queue()
            ctx = RunContext(run_id=run_id, queue=queue, task=None)  # type: ignore[arg-type]
            task = asyncio.create_task(self._execute_run(ctx, payload))
            ctx.task = task
            self._runs[run_id] = ctx

        def _cleanup(task: asyncio.Task) -> None:
            try:
                task.result()
            except asyncio.CancelledError:
                pass
            except Exception as exc:  # noqa: BLE001
                logger.exception("Run %s failed: %s", run_id, exc)
            finally:
                asyncio.create_task(self._finalize_run(run_id))

        task.add_done_callback(_cleanup)

    async def _finalize_run(self, run_id: str) -> None:
        async with self._lock:
            ctx = self._runs.pop(run_id, None)
        if ctx:
            await ctx.queue.put(None)

    async def stream_events(self, run_id: str) -> AsyncGenerator[dict[str, Any], None]:
        ctx = await self._get_context(run_id)
        while True:
            event = await ctx.queue.get()
            if event is None:
                break
            yield event

    async def cancel_run(self, run_id: str) -> None:
        ctx = await self._get_context(run_id)
        ctx.cancel_event.set()

    async def ensure_run_exists(self, run_id: str) -> None:
        await self._get_context(run_id)

    async def _get_context(self, run_id: str) -> RunContext:
        async with self._lock:
            ctx = self._runs.get(run_id)
        if not ctx:
            raise RunNotFoundError(run_id)
        return ctx

    async def _execute_run(
        self,
        ctx: RunContext,
        payload: dict[str, Any],
    ) -> None:
        run_id = ctx.run_id
        queue = ctx.queue

        await queue.put(self._event("run.started", {"runId": run_id}))

        api_key = self._settings_store.get_deepseek_api_key()
        if not api_key:
            await queue.put(
                self._event(
                    "run.failed",
                    {
                        "runId": run_id,
                        "errorCode": "MISSING_API_KEY",
                        "message": "DeepSeek API key is not configured.",
                    },
                )
            )
            return

        client = AsyncOpenAI(
            api_key=api_key,
            base_url=self._settings.deepseek_api_base,
        )

        messages = self._build_messages(payload)
        temperature = payload.get("constraints", {}).get("temperature", 0.2)

        try:
            stream = await client.chat.completions.create(
                model=self._settings.deepseek_model,
                messages=messages,
                stream=True,
                temperature=temperature,
            )

            accumulated: List[str] = []

            async for chunk in stream:
                if ctx.cancel_event.is_set():
                    await queue.put(
                        self._event(
                            "run.cancelled",
                            {"runId": run_id, "reason": "cancelled_by_client"},
                        )
                    )
                    try:
                        await stream.aclose()
                    except Exception:  # noqa: BLE001
                        pass
                    return
                for choice in chunk.choices:
                    delta = getattr(choice, "delta", None)
                    if not delta:
                        continue
                    content = getattr(delta, "content", None)
                    if content:
                        accumulated.append(content)
                        await queue.put(
                            self._event(
                                "run.delta",
                                {"runId": run_id, "text": content},
                            )
                        )

            full_text = "".join(accumulated).strip()
            await queue.put(
                self._event(
                    "run.completed",
                    {"runId": run_id, "response": full_text},
                )
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Run %s failed", run_id)
            await queue.put(
                self._event(
                    "run.failed",
                    {
                        "runId": run_id,
                        "errorCode": "MODEL_ERROR",
                        "message": str(exc),
                    },
                )
            )

    def _event(self, name: str, data: dict[str, Any]) -> dict[str, Any]:
        return {
            "event": name,
            "data": json.dumps(jsonable_encoder(data)),
        }

    def _build_messages(self, payload: dict[str, Any]) -> List[dict[str, str]]:
        conversation = payload.get("conversation") or []
        messages: List[dict[str, str]] = []
        system_prompt = payload.get("prompt")
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        for item in conversation:
            role = item.get("role")
            content = item.get("content")
            if role and content:
                messages.append({"role": role, "content": content})
        if not messages:
            messages.append(
                {
                    "role": "system",
                    "content": "You are AgentRelay conversation assistant. Keep replies concise.",
                }
            )
        return messages
