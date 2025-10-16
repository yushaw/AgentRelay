# Windows 安装包打包指南

本指南说明如何将 AgentRelay 打包成可独立安装的 Windows 应用，包含 Electron 对话端与嵌入式 Python Runtime。

## 1. 整体流程
1. **准备 Python Runtime**：
   - 推荐执行仓库提供的脚本：
     ```bash
     python scripts/bootstrap_python_runtime.py
     ```
     它会自动下载 CPython 3.11 x64 embed 包、调整 `python311._pth`，并使用 `pip download` 拉取 Windows wheel 展开到 `python-runtime/dist/Lib/site-packages/`。
   - 若需自定义处理，请确保 `python-runtime/dist/` 中包含 `python.exe`、`python311.dll`、标准库目录以及安装好的项目依赖，并复制 `python-runtime/agentrelay/` 与 `entrypoint.py`。
2. **构建 Electron 主进程**：
   ```bash
   cd electron-app
   npm install
   npm run build:main
   ```
3. **生成安装包**：
 ```bash
 npm run dist
 ```
 构建完成后，`electron-app/dist/` 会出现 `.exe` 安装程序和 `.blockmap` 更新元数据。
  - 也可以在仓库根目录执行 `node scripts/agentrelay-cli.mjs package`，自动触发上述命令。
4. **验证安装**：
   - 运行生成的安装程序，确认默认会拉起桌面对话窗口。
   - 使用 `agentrelay.exe --serve --headless --port 51055` 验证无头模式和 `/status` 接口。

## 2. 目录结构要求
```
resources/
├─ app.asar (Electron 主进程 + 前端页面)
└─ python-runtime/
   ├─ python.exe
   ├─ entrypoint.py
   ├─ Lib/
   └─ ...
```
`agentrelay.exe` 会调用 `python-runtime/python.exe entrypoint.py --port <port>`，因此确保路径匹配至关重要。

## 3. 常见问题
- **缺少 VCRUNTIME**：嵌入式 Python 需附带 `vcruntime140.dll`（通常在 embed 包中），否则用户机器上可能报错。
- **依赖体积大**：可使用 `pip install --target` 将依赖装入特定目录，并剔除测试、文档文件减少包体。
- **自动更新**：Electron Builder 已生成 NSIS 安装包，后续可拓展 `publish` 字段与 AutoUpdater 结合。

> 建议在 CI/CD 中编写脚本自动拉取 embed Python、安装依赖并调用 `npm run dist`，确保产物一致。

## 4. GitHub Release 工作流
- 仓库已提供 `.github/workflows/release.yml`：当推送符合 `v*.*.*` 的标签时，会在 `windows-latest` Runner 上自动执行发布流程。
- 工作流步骤：
  1. 下载并构建嵌入式 Python（`python scripts/bootstrap_python_runtime.py`）。
  2. 在 `electron-app/` 内安装依赖并运行 `npm run dist`。
  3. 上传生成的 `AgentRelay-*.exe` 与 `.blockmap` 到当前 Job 产物，并附加到对应的 GitHub Release。
- 若需要签名或额外分发渠道，可在该工作流基础上继续扩展。
