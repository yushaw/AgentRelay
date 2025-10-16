const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

function appendLog(prefix, message) {
  const entry = document.createElement("div");
  entry.textContent = `[${prefix}] ${message}`;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

async function initialize() {
  if (!window.agentrelay) {
    statusEl.textContent = "预加载脚本未就绪";
    return;
  }
  const options = await window.agentrelay.getOptions();
  statusEl.textContent = `等待 Python runtime (${options.host}:${options.port})`;

  window.agentrelay.onRuntimeReady((payload) => {
    statusEl.textContent = `Python runtime 已就绪 (${payload.host}:${payload.port})`;
    sendBtn.disabled = false;
  });

  window.agentrelay.onStdout((line) => appendLog("stdout", line));
  window.agentrelay.onStderr((line) => appendLog("stderr", line));
  window.agentrelay.onRuntimeExit((payload) => {
    statusEl.textContent = `Python 进程已退出 (${JSON.stringify(payload)})`;
    sendBtn.disabled = true;
  });

  sendBtn.addEventListener("click", () => {
    const text = inputEl.value.trim();
    if (!text) return;
    appendLog("ui", `发送占位消息：${text}`);
    inputEl.value = "";
  });
}

initialize();
