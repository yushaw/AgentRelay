from fastapi.testclient import TestClient

from agentrelay.app import create_app
from agentrelay.config import AgentRelaySettings
from agentrelay.services.run_manager import RunManager

from .conftest import TempSettingsStore


def build_test_app(store: TempSettingsStore):
    settings = AgentRelaySettings(
        service_version="1.2.3-test",
        deepseek_api_base="https://api.deepseek.com/v1",
        deepseek_model="deepseek-chat",
    )
    app = create_app(settings)
    app.state.settings_store = store
    app.state.run_manager = RunManager(settings, store)
    return app, settings


def test_status_includes_deepseek_metadata(tmp_path):
    store = TempSettingsStore(tmp_path)
    store.set_deepseek_settings("sk-demo", "https://custom-base")

    app, _settings = build_test_app(store)
    client = TestClient(app)

    response = client.get("/status")
    assert response.status_code == 200
    payload = response.json()

    deepseek_meta = payload["metadata"]["deepseek"]
    assert deepseek_meta["apiKeySet"] is True
    assert deepseek_meta["baseUrl"] == "https://custom-base"
    assert payload["version"] == "1.2.3-test"
