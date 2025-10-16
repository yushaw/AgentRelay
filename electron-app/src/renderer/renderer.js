const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const chatLogEl = document.getElementById("chat-log");
const chatInputEl = document.getElementById("chat-input");
const sendBtn = document.getElementById("send");
const apiKeyInput = document.getElementById("api-key");
const saveKeyBtn = document.getElementById("save-key");
const clearKeyBtn = document.getElementById("clear-key");
const settingsMessageEl = document.getElementById("settings-message");

let runtimeOptions = { host: "127.0.0.1", port: 51055 };
let runtimeReady = false;
let apiKeyConfigured = false;
let runInProgress = false;
let activeEventSource = null;
const conversation = [];

function appendLog(prefix, message) {
  const entry = document.createElement("div");
  entry.textContent = `[${prefix}] ${message}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function createBubble(role, text, id) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  if (id) {
    bubble.dataset.messageId = id;
  }
  chatLogEl.appendChild(bubble);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
  return bubble;
}

function updateSettingsMessage(text, tone = "info") {
  settingsMessageEl.textContent = text ?? "";
  settingsMessageEl.style.color =
    tone === "error" ? "#f87171" : tone === "success" ? "#34d399" : "#38bdf8";
}

function baseUrl() {
  return `http://${runtimeOptions.host}:${runtimeOptions.port}`;
}

function updateControls() {
  const hasInput = !!chatInputEl.value.trim();
  sendBtn.disabled = !(runtimeReady && apiKeyConfigured && hasInput && !runInProgress);
  saveKeyBtn.disabled = !runtimeReady || !apiKeyInput.value.trim();
  clearKeyBtn.disabled = !runtimeReady || !apiKeyConfigured;
}

function setStatus(text) {
  statusEl.textContent = text;
}

async function refreshStatus() {
  if (!runtimeReady) return;
  try {
    const response = await fetch(`${baseUrl()}/status`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const deepseekMeta = data?.metadata?.deepseek ?? {};
    apiKeyConfigured = !!deepseekMeta.apiKeySet;
    setStatus(
      `Python runtime 已就绪 (${runtimeOptions.host}:${runtimeOptions.port}) · DeepSeek Key: ${apiKeyConfigured ? "已配置" : "未配置"}`,
    );
    updateSettingsMessage(
      apiKeyConfigured ? "已保存 DeepSeek API Key" : "尚未配置 API Key",
      apiKeyConfigured ? "success" : "info",
    );
    updateControls();
  } catch (error) {
    setStatus(`无法获取状态：${error}`);
  }
}

async function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  try {
    const response = await fetch(`${baseUrl()}/settings/deepseek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    apiKeyConfigured = !!data.apiKeySet;
    updateSettingsMessage("API Key 已保存", "success");
    apiKeyInput.value = "";
    updateControls();
    await refreshStatus();
  } catch (error) {
    updateSettingsMessage(`保存失败：${error}`, "error");
  }
}

async function clearApiKey() {
  try {
    const response = await fetch(`${baseUrl()}/settings/deepseek`, { method: "DELETE" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    apiKeyConfigured = false;
    updateSettingsMessage("已清除 API Key", "info");
    updateControls();
    await refreshStatus();
  } catch (error) {
    updateSettingsMessage(`清除失败：${error}`, "error");
  }
}

function closeActiveStream() {
  if (activeEventSource) {
    activeEventSource.close();
    activeEventSource = null;
  }
}

function finishRun() {
  runInProgress = false;
  closeActiveStream();
  updateControls();
}

async function startRun(text) {
  const userMessage = { role: "user", content: text };
  conversation.push(userMessage);
  createBubble("user", text);
  chatInputEl.value = "";
  runInProgress = true;
  updateControls();

  const runId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  const payload = {
    runId,
    agentId: "workflow.chat.deepseek",
    conversation,
    constraints: { temperature: 0.2 },
  };

  let assistantBuffer = "";
  const assistantBubble = createBubble("assistant", "…", runId);

  try {
    const response = await fetch(`${baseUrl()}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    closeActiveStream();
    activeEventSource = new EventSource(`${baseUrl()}/runs/${runId}/events`);

    activeEventSource.addEventListener("run.delta", (event) => {
      const data = JSON.parse(event.data);
      if (data.text) {
        assistantBuffer += data.text;
        assistantBubble.textContent = assistantBuffer;
      }
    });

    activeEventSource.addEventListener("run.completed", (event) => {
      const data = JSON.parse(event.data);
      const text = data.response || assistantBuffer || "";
      assistantBubble.textContent = text;
      conversation.push({ role: "assistant", content: text });
      finishRun();
    });

    activeEventSource.addEventListener("run.failed", (event) => {
      const data = JSON.parse(event.data);
      assistantBubble.textContent = `发生错误：${data.message || "未知错误"}`;
      assistantBubble.style.border = "1px solid #f87171";
      finishRun();
    });

    activeEventSource.addEventListener("run.cancelled", () => {
      assistantBubble.textContent = "运行已取消";
      finishRun();
    });

    activeEventSource.onerror = () => {
      if (runInProgress) {
        assistantBubble.textContent = "事件流中断";
        finishRun();
      }
    };
  } catch (error) {
    assistantBubble.textContent = `请求失败：${error}`;
    assistantBubble.style.border = "1px solid #f87171";
    finishRun();
  }
}

async function initialise() {
  if (!window.agentrelay) {
    setStatus("预加载脚本未就绪");
    return;
  }

  const options = await window.agentrelay.getOptions();
  runtimeOptions = options;
  setStatus(`等待 Python runtime (${options.host}:${options.port})`);
  updateControls();

  window.agentrelay.onRuntimeReady(async (payload) => {
    runtimeOptions = payload;
    runtimeReady = true;
    await refreshStatus();
    updateControls();
  });

  window.agentrelay.onStdout((line) => appendLog("stdout", line));
  window.agentrelay.onStderr((line) => appendLog("stderr", line));
  window.agentrelay.onRuntimeExit((payload) => {
    runtimeReady = false;
    apiKeyConfigured = false;
    setStatus(`Python 进程已退出 (${JSON.stringify(payload)})`);
    updateSettingsMessage("runtime 已停止", "info");
    updateControls();
    closeActiveStream();
  });

  chatInputEl.addEventListener("input", updateControls);
  apiKeyInput.addEventListener("input", updateControls);
  saveKeyBtn.addEventListener("click", saveApiKey);
  clearKeyBtn.addEventListener("click", clearApiKey);
  sendBtn.addEventListener("click", () => {
    const text = chatInputEl.value.trim();
    if (!text || runInProgress) return;
    startRun(text);
  });
}

initialise();
updateSettingsMessage("等待 runtime...", "info");

window.addEventListener("beforeunload", closeActiveStream);
