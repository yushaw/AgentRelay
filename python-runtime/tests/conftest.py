import pytest
from pathlib import Path

from agentrelay.services.settings_store import SettingsStore


class TempSettingsStore(SettingsStore):
    def __init__(self, base_dir: Path):
        self._settings_dir = base_dir
        self._settings_file = base_dir / "settings.json"
        self._settings_dir.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def temp_store(tmp_path: Path) -> TempSettingsStore:
    return TempSettingsStore(tmp_path)
