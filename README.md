# AgentRelay 项目说明

AgentRelay 是一个面向 Windows 10+ 的本地 AI Agent “副驾”平台，组合 Electron 桌面端对话体验与 Python LangGraph Runtime，为 SnapDescribe 生态及第三方应用提供统一的推理、工具编排与通信能力。

## 1. 项目目标
- 交付一个可独立安装的桌面端：Electron 提供 ChatGPT 式对话 UI，并通过本地 HTTP/SSE 接入 LangGraph 工作流。
- 暴露可复用的本地服务：任何客户端（Electron、自研工具或 SnapDescribe.Host）都可以通过 AgentRelay 协议访问 `/status`、`/agents`、`/runs` 等接口。
- 保持安全、可审计：运行环境内置受控 Python 解释器、日志输出与工具调用闭环，满足 deterministic 与离线约束。

## 2. 目录结构
```
AgentRelay/
 ├─ electron-app/         # Electron 主工程 + 构建配置
 │   ├─ src/main/         # 主进程（管理 Python runtime、headless 模式、IPC）
 │   ├─ src/renderer/     # 对话 UI（最小原型）
 │   └─ package.json      # electron-builder 配置、脚本
 ├─ python-runtime/
 │   ├─ agentrelay/       # FastAPI + LangGraph Runtime
 │   ├─ requirements.txt
 │   ├─ entrypoint.py     # CLI：启动 HTTP/SSE 服务
 │   └─ dist/             # 嵌入式 CPython 及依赖（由脚本自动填充）
 ├─ docs/                 # 开发、打包、协议文档
 ├─ scripts/              # 辅助脚本（Runtime 打包、CLI 等）
 └─ installer/            # 安装器/更新器扩展点（预留）
```

Electron 与 Python 始终通过本地 HTTP/SSE 通信；主进程只封装协议 SDK，不维护私有 IPC。

## 3. 与 SnapDescribe.Host 的协作
### 3.1 进程与模式
- `agentrelay.exe --serve --port=51055 --auth-token=<token>`：默认模式，启动 Python 服务并打开 Electron 对话窗口。
- `agentrelay.exe --serve --headless`：无头运行，仅托管 HTTP/SSE 服务，适用于被其他桌面应用嵌入。
- Python Runtime 在启动完成后需输出 `AGENTRELAY READY <port>` 或写入约定的 ready 文件，供宿主探测。
- 发生崩溃时，Electron 负责拉起新的 Python 子进程并记录事件。

### 3.2 协议约定
- 所有请求都遵循 `docs/AgentRelayProtocol.md`，并携带 `Authorization: Bearer <token>` 与 `X-AgentRelay-Protocol`.
- 核心端点：
  - `GET /status`：返回 `service`、`version`、`protocolVersion`、`agentsEtag`、`maxConcurrentRuns`。
  - `GET /agents`：读取 Agent 模板，多语言名称/描述与参数定义。
  - `POST /runs` + `GET /runs/{id}/events`：启动 LangGraph Run 与监听事件流。
  - `POST /runs/{id}/tools/{callId}`：接收宿主执行工具的结果。
  - `POST /runs/{id}/cancel`：取消运行。
- LangGraph 通过 `run.tool_call` 请求任何外部执行；若宿主超时未回应，必须发 `run.failed` 且 `errorCode=TOOL_TIMEOUT`。

### 3.3 日志与离线约束
- Python 侧输出 JSONL 日志（`timestamp`, `level`, `message`, `runId`, `traceId`, `context`）。
- Electron UI 提供实时日志、运行状态与调试开关。
- 当启动参数/请求声明 `allowNetwork=false` 时，Runtime 必须阻止任何外部网络连接。

## 4. 里程碑
- **M0 骨架**：Electron+Python 脚手架、`agentrelay.exe --serve`、`GET /status`。
- **M1 核心执行**：接入 LangGraph，多轮对话 Agent，完成 Run→SSE→工具回调闭环。
- **M2 Catalog & UI**：`/agents` 模板目录、对话/日志可视化、Runtime 下载校验。
- **M3 安全稳定**：鉴权、配置加密、并发限制、错误码与超时策略、自动更新。
- **M4 生态扩展**：MCP/外部模型桥接、热更新工作流、CI/CD。

## 5. 发布形态
- 目标平台：Windows 10 及以上（后续再评估其他平台）。
- 安装包产物包含：
  - NSIS 安装程序（由 `npm run dist` 生成）。
  - 嵌入式 CPython（`python-runtime/dist/`）及 `agentrelay` 包。
  - `agentrelay.exe` CLI、`agentrelay-info.json` 元数据、`tokens.json`（宿主写入）。
- CLI 参数：`--serve`、`--headless`、`--port`、`--host`、`--offline`、`--allow-guest`、`--python <path>`。

## 6. 文档与同步
- `docs/AgentRelayProtocol.md`：HTTP/SSE 协议说明，与主仓 `docs/AgentRelayProtocol.md` 保持一致。
- `docs/development.md`：启动/调试指南，包含生成嵌入式 Python Runtime 的脚本说明。
- `docs/packaging.md`：Windows 安装包打包流程与常见问题。

## 7. 示例请求
```
POST /runs
Authorization: Bearer <token>
X-AgentRelay-Protocol: 1.0
{
  "runId": "2e8e0c9a-2b44-4b7e-9d9d-57d28c24f6ba",
  "recordId": "capture_20250301_101530",
  "agentId": "workflow.summary.v1",
  "locale": "zh-CN",
  "prompt": "请总结截图中的网页要点并提供行动建议。",
  "conversation": [
    { "role": "system", "content": "You are SnapDescribe Agent..." },
    { "role": "user", "content": "最新新闻摘要", "image": "data:image/png;base64,..." }
  ],
  "toolInventory": [
    {
      "id": "shell.generic",
      "name": "Shell Executor",
      "timeoutSec": 30,
      "argumentsSchema": "{prompt} {message}"
    }
  ],
  "constraints": {
    "allowNetwork": false,
    "maxToolConcurrency": 1,
    "temperature": 0
  },
  "clientInfo": {
    "appVersion": "2.5.0",
    "machineId": "HOST-12345"
  }
}
```

SSE 事件示例：
```
event: run.started
data: {"runId":"2e8e0c9a-2b44-4b7e-9d9d-57d28c24f6ba"}

event: run.tool_call
data: {
  "runId": "2e8e0c9a-2b44-4b7e-9d9d-57d28c24f6ba",
  "toolCallId": "tool-001",
  "toolId": "shell.generic",
  "arguments": "python summarize.py \"截图内容\"",
  "timeoutSec": 30
}

event: run.completed
data: {
  "runId": "2e8e0c9a-2b44-4b7e-9d9d-57d28c24f6ba",
  "response": "以下是网页要点：...\n建议：...",
  "metadata": { "tokens": 652, "model": "gpt-4o" }
}
```

若宿主未在超时时间内回传工具结果，AgentRelay 会发送：
```
event: run.failed
data: {"runId":"...","errorCode":"TOOL_TIMEOUT","message":"Host tool call timeout"}
```

## 8. 变更准则
- 协议调整需同步更新仓库 docs 与主仓文档，并 bump `protocolVersion`。
- 新版本发布后请更新 manifest、Release Notes，并通知宿主团队跑兼容性测试。
- 遇到协议不兼容时应提供回滚/降级指引，保留上一稳定版本下载。
