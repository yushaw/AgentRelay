def test_settings_store_persists_base_and_key(temp_store):
    store = temp_store
    base_url = "https://mock-base"
    api_key = "sk-test"

    store.set_deepseek_settings(api_key, base_url)

    resolved = store.get_deepseek_settings()
    assert resolved["apiKey"] == api_key
    assert resolved["baseUrl"] == base_url

    # clearing key keeps base url fallback
    store.set_deepseek_settings("", "")
    resolved_after_clear = store.get_deepseek_settings(default_base="https://default")
    assert resolved_after_clear["apiKey"] is None
    assert resolved_after_clear["baseUrl"] == "https://default"
