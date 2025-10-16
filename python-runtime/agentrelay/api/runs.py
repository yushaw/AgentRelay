from __future__ import annotations

import uuid
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from ..services.run_manager import RunManager, RunNotFoundError

router = APIRouter(prefix="/runs", tags=["runs"])


def get_run_manager(request: Request) -> RunManager:
    manager: RunManager | None = getattr(request.app.state, "run_manager", None)
    if not manager:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Run manager not initialised")
    return manager


class ConversationMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ToolDefinition(BaseModel):
    id: str
    name: Optional[str] = None
    timeoutSec: Optional[int] = Field(default=None, ge=1)


class Constraints(BaseModel):
    allowNetwork: Optional[bool] = None
    maxToolConcurrency: Optional[int] = None
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class CreateRunRequest(BaseModel):
    runId: Optional[str] = None
    recordId: Optional[str] = None
    prompt: Optional[str] = None
    agentId: Optional[str] = None
    locale: Optional[str] = None
    conversation: List[ConversationMessage] = Field(default_factory=list)
    toolInventory: List[ToolDefinition] = Field(default_factory=list)
    constraints: Constraints = Field(default_factory=Constraints)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CreateRunResponse(BaseModel):
    runId: str
    status: Literal["accepted"] = "accepted"


@router.post("", status_code=status.HTTP_202_ACCEPTED, response_model=CreateRunResponse)
async def create_run(
    request: CreateRunRequest,
    response: Response,
    manager: RunManager = Depends(get_run_manager),
) -> CreateRunResponse:
    run_id = request.runId or str(uuid.uuid4())
    payload = request.model_dump(exclude_none=True)
    payload["runId"] = run_id

    try:
        await manager.create_run(run_id, payload)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Run already exists") from None

    response.headers["Location"] = f"/runs/{run_id}/events"
    return CreateRunResponse(runId=run_id)


@router.get("/{run_id}/events")
async def stream_run_events(run_id: str, manager: RunManager = Depends(get_run_manager)) -> EventSourceResponse:
    try:
        await manager.ensure_run_exists(run_id)
    except RunNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found") from exc

    event_generator = manager.stream_events(run_id)

    async def event_publisher():
        try:
            async for event in event_generator:
                yield event
        except RunNotFoundError as exc:  # pragma: no cover - cleanup
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found") from exc

    return EventSourceResponse(event_publisher())


@router.post("/{run_id}/cancel", status_code=status.HTTP_202_ACCEPTED)
async def cancel_run(run_id: str, manager: RunManager = Depends(get_run_manager)) -> dict[str, str]:
    try:
        await manager.cancel_run(run_id)
    except RunNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found") from exc
    return {"runId": run_id, "status": "cancelling"}
