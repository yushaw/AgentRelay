from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from platformdirs import PlatformDirs


class SettingsStore:
    """Persist simple AgentRelay runtime settings on disk."""

    def __init__(self, app_name: str = "AgentRelay", app_author: str = "AgentRelay"):
        dirs = PlatformDirs(appname=app_name, appauthor=app_author, roaming=False)
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
    def get_deepseek_settings(self, default_base: str | None = None) -> dict[str, str | None]:
        data = self.load()
        deepseek = data.get("deepseek") or {}
        api_key = deepseek.get("apiKey")
        base_url = deepseek.get("baseUrl") or default_base
        return {
            "apiKey": api_key if isinstance(api_key, str) else None,
            "baseUrl": base_url if isinstance(base_url, str) else default_base,
        }

    def set_deepseek_settings(self, api_key: str | None, base_url: str | None) -> None:
        data = self.load()
        deepseek = data.get("deepseek") or {}

        if api_key is not None:
            api_key = api_key.strip()
            if api_key:
                deepseek["apiKey"] = api_key
            else:
                deepseek.pop("apiKey", None)

        if base_url is not None:
            base_url = base_url.strip()
            if base_url:
                deepseek["baseUrl"] = base_url
            else:
                deepseek.pop("baseUrl", None)

        if deepseek:
            data["deepseek"] = deepseek
        elif "deepseek" in data:
            data.pop("deepseek")
        self.save(data)

    def get_deepseek_api_key(self) -> str | None:
        return self.get_deepseek_settings().get("apiKey")

    def get_deepseek_api_base(self, fallback: str) -> str:
        settings = self.get_deepseek_settings(default_base=fallback)
        return (settings.get("baseUrl") or fallback).strip()

    def deepseek_api_key_set(self) -> bool:
        return self.get_deepseek_api_key() is not None
