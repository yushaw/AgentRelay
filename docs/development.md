# 开发快速上手

本仓库分为 Electron 前端 (`electron-app/`) 与 Python LangGraph Runtime (`python-runtime/`) 两部分。目标平台为 Windows 10 及以上，macOS/Linux 可用于本地开发验证。

## 1. 准备环境
- 安装 Node.js 20+ 与 npm。
- 安装 Python 3.12，并创建虚拟环境：
  ```bash
  cd python-runtime
  python -m venv .venv
  source .venv/bin/activate  # Windows 使用 .venv\Scripts\activate
  pip install -r requirements.txt
  ```
- 安装 Electron 依赖：
  ```bash
  cd electron-app
  npm install
  ```

## 2. 启动 Python Runtime（独立调试）
```bash
cd python-runtime
python entrypoint.py --host 127.0.0.1 --port 51055
```
应用启动后会在标准输出打印 `AGENTRELAY READY <port>`，表示 `/status` 接口可用。

## 3. 启动 Electron 对话应用
仓库根目录提供 CLI 脚本，可自动构建并拉起 Electron，内部会同时托管 Python Runtime：
```bash
node scripts/agentrelay-cli.mjs --serve
```
- `--headless`：仅启动 Python Runtime，不打开对话窗口。
- `--port 51055`、`--host 127.0.0.1`：覆盖默认监听地址。

> 注意：首次执行会触发 `npm run build:main`，需要确保 `electron-app/node_modules` 已安装到位。

## 4. 前端开发提示
- 主进程代码位于 `electron-app/src/main/`，负责托管 Python Runtime、会话存储以及渲染层 IPC。
- 预加载脚本 `src/main/preload.ts` 通过 `contextBridge` 暴露 `window.agentrelay`，包含 Runtime 选项、标准输出事件以及 `sessions.load/save` 接口。
- 渲染层使用 React + Vite + Tailwind + shadcn/ui，入口在 `src/renderer/src/`；其中 `state/app-store.ts` 管理多会话、设置与 Runtime 状态。
- 调试方式：
  1. 修改前端后执行 `npm run build`（会编译主进程与 renderer）。
  2. 运行 `node scripts/agentrelay-cli.mjs --serve` 启动整套应用查看效果。
- 对话界面已提供多会话、Markdown 渲染、复制/停止等能力；如需扩展，可在 `components/chat` 与 `components/sidebar` 下添加新组件。
- 所有客户端（Electron、本地宿主或外部生态应用）均应复用 `/status`、`/agents`、`/runs` 等端点，避免分叉。

## 5. 打包发布
1. 准备嵌入式 Python 运行时：
   - 推荐命令：
     ```bash
     python scripts/bootstrap_python_runtime.py
     ```
     该脚本会自动下载 CPython 3.12 x64 embed 包，按需调整 `python312._pth`，并基于 `requirements.txt` 下载 Windows wheel 展开至 `python-runtime/dist/Lib/site-packages/`。
   - 如果需要手动处理，可参考脚本逻辑，确保 `python-runtime/dist/` 中包含 `python.exe`、标准库以及项目依赖。
2. 生成安装包：
   ```bash
   cd electron-app
   npm install  # 如未安装
   npm run dist
   ```
   Electron Builder 会生成 NSIS 安装包，产物默认位于 `electron-app/dist/`，包含 Python runtime 及所有前端资源。
3. 安装程序支持 `--headless`、`--no-ui` 等运行参数，通过 `agentrelay.exe --serve --headless` 进入无头模式。

> 若需要自动化构建，可在 CI 中先调用自定义脚本填充 `python-runtime/dist`，再运行 `npm run dist`。

## 6. DeepSeek 对话调试
- 启动桌面端后，等待状态栏显示 “Python runtime 已就绪”。
- 在“DeepSeek 设置”卡片中粘贴 OpenAI 兼容的 DeepSeek API Key，点击 **保存**，状态提示会更新为“已保存”。
- 输入任意消息点击 **发送**，Electron 会通过本地 `/runs` API 创建 LangGraph Run，SSE 事件流会实时更新对话气泡。
- Runtime 日志区域展示 Python 侧 JSONL 输出，便于观察模型调用、错误信息等；同样可在 `/status` 的 `metadata.deepseek` 字段确认 API Key 是否已配置。

## 7. 测试
- 后端使用 `pytest`，测试示例位于 `python-runtime/tests/`，覆盖 DeepSeek 设置、`/status` 元数据以及 RunManager 在无 API Key 时的错误路径。
- 运行方式：
  ```bash
  cd python-runtime
  python -m pytest
  ```
- 建议在更新 LangGraph workflow 或设置逻辑后同步维护这些测试，以确保桌面端与 Runtime 协议契合。
