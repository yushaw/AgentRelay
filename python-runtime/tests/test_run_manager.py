import pytest

from agentrelay.config import AgentRelaySettings
from agentrelay.services.run_manager import RunManager


@pytest.mark.asyncio
async def test_run_manager_fails_without_api_key(temp_store):
    store = temp_store
    settings = AgentRelaySettings()
    manager = RunManager(settings, store)

    payload = {
        "runId": "run-test",
        "prompt": "You are testing",
        "conversation": [
            {"role": "user", "content": "Hi"},
        ],
    }

    await manager.create_run("run-test", payload)

    events = []
    async for event in manager.stream_events("run-test"):
        events.append(event)

    assert events[0]["event"] == "run.started"
    assert events[-1]["event"] == "run.failed"
    assert "MISSING_API_KEY" in events[-1]["data"]
