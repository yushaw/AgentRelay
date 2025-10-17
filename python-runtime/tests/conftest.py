from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agentrelay.services.settings_store import SettingsStore


class TempSettingsStore(SettingsStore):
    def __init__(self, base_dir: Path):
        self._settings_dir = base_dir
        self._settings_file = base_dir / "settings.json"
        self._settings_dir.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def temp_store(tmp_path: Path) -> TempSettingsStore:
    return TempSettingsStore(tmp_path)
