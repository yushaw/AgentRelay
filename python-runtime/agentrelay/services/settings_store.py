from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from platformdirs import PlatformDirs


class SettingsStore:
    """Persist simple AgentRelay runtime settings on disk."""

    def __init__(self, app_name: str = "AgentRelay", app_author: str = "AgentRelay"):
        dirs = PlatformDirs(app_name=app_name, appauthor=app_author, roaming=False)
        self._settings_dir = Path(dirs.user_data_dir)
        self._settings_file = self._settings_dir / "settings.json"
        self._settings_dir.mkdir(parents=True, exist_ok=True)

    @property
    def settings_path(self) -> Path:
        return self._settings_file

    def load(self) -> dict[str, Any]:
        if not self._settings_file.exists():
            return {}
        try:
            return json.loads(self._settings_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def save(self, data: dict[str, Any]) -> None:
        self._settings_dir.mkdir(parents=True, exist_ok=True)
        self._settings_file.write_text(json.dumps(data, indent=2), encoding="utf-8")

    # DeepSeek specific helpers -------------------------------------------------
    def get_deepseek_api_key(self) -> str | None:
        data = self.load()
        deepseek = data.get("deepseek") or {}
        key = deepseek.get("apiKey")
        if isinstance(key, str) and key.strip():
            return key
        return None

    def set_deepseek_api_key(self, api_key: str | None) -> None:
        data = self.load()
        deepseek = data.get("deepseek") or {}
        if api_key and api_key.strip():
            deepseek["apiKey"] = api_key.strip()
        else:
            deepseek.pop("apiKey", None)
        if deepseek:
            data["deepseek"] = deepseek
        elif "deepseek" in data:
            data.pop("deepseek")
        self.save(data)

    def deepseek_api_key_set(self) -> bool:
        return self.get_deepseek_api_key() is not None
