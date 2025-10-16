import { app, BrowserWindow, ipcMain } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { EventEmitter } from "node:events";
import log from "electron-log";

import type { RuntimeOptions } from "../shared/ipc";
import type { StoredChatData } from "../shared/types";
import { ChatStore } from "./chatStore";

interface ReadyPayload {
  port: number;
}

class PythonRuntimeManager extends EventEmitter {
  private child?: ChildProcess;

  private readonly options: RuntimeOptions;

  private ready = false;

  constructor(options: RuntimeOptions) {
    super();
    this.options = options;
  }

  public start(): void {
    if (this.child) {
      return;
    }
    const entrypoint = this.resolveEntrypoint();
    const pythonExecutable =
      this.options.pythonPath ?? process.env.SIDECAR_PYTHON ?? "python";

    const args = [
      entrypoint,
      "--host",
      this.options.host,
      "--port",
      String(this.options.port),
    ];
    if (this.options.offline) {
      args.push("--offline");
    }
    if (this.options.allowGuest) {
      args.push("--allow-guest");
    }

    const child = spawn(pythonExecutable, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });
    this.child = child;

    const stdout = child.stdout;
    if (stdout) {
      this.watchOutput(stdout);
    }

    const stderr = child.stderr;
    if (stderr) {
      stderr.on("data", (chunk) => {
        log.error(`[py stderr] ${chunk}`);
        this.emit("stderr", chunk.toString());
      });
    }

    child.on("exit", (code, signal) => {
      log.warn("Python runtime exited", { code, signal });
      this.ready = false;
      this.emit("exit", { code, signal });
    });
  }

  public stop(): void {
    if (!this.child) {
      return;
    }
    if (process.platform === "win32") {
      this.child.kill();
    } else {
      this.child.kill("SIGTERM");
    }
    this.child = undefined;
  }

  private resolveEntrypoint(): string {
    if (app.isPackaged) {
      return join(process.resourcesPath, "python-runtime", "entrypoint.py");
    }

    const mainDir = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(mainDir, "..", "..", "..");
    return join(repoRoot, "python-runtime", "entrypoint.py");
  }

  private watchOutput(stream: NodeJS.ReadableStream): void {
    const rl = createInterface({ input: stream });
    rl.on("line", (line) => {
      log.info(`[py stdout] ${line}`);
      this.emit("stdout", line);
      if (!this.ready && line.startsWith("AGENTRELAY READY")) {
        this.ready = true;
        const parts = line.trim().split(" ");
        const port = Number.parseInt(parts.at(-1) ?? "", 10) || this.options.port;
        this.emit("ready", { port } satisfies ReadyPayload);
      }
    });
  }
}

function parseRuntimeOptions(argv: string[]): RuntimeOptions {
  const options: RuntimeOptions = {
    host: "127.0.0.1",
    port: 51055,
    headless: false,
    offline: false,
    allowGuest: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === "--headless" || value === "--no-ui") {
      options.headless = true;
    } else if (value === "--offline") {
      options.offline = true;
    } else if (value === "--allow-guest") {
      options.allowGuest = true;
    } else if (value === "--port") {
      const next = argv[i + 1];
      if (next) {
        options.port = Number.parseInt(next, 10) || options.port;
      }
      i += 1;
    } else if (value === "--host") {
      const next = argv[i + 1];
      if (next) {
        options.host = next;
      }
      i += 1;
    } else if (value === "--python") {
      const next = argv[i + 1];
      if (next) {
        options.pythonPath = next;
      }
      i += 1;
    }
  }

  return options;
}

let mainWindow: BrowserWindow | null = null;
const runtimeOptions = parseRuntimeOptions(process.argv.slice(1));
let chatStore: ChatStore | null = null;

if (app.isPackaged && process.platform === "win32") {
  runtimeOptions.pythonPath = join(
    process.resourcesPath,
    "python-runtime",
    "python.exe",
  );
}
const runtimeManager = new PythonRuntimeManager(runtimeOptions);

async function ensureChatStore(): Promise<ChatStore> {
  if (!chatStore) {
    chatStore = new ChatStore();
    await chatStore.init();
  }
  return chatStore;
}

function resolveRendererPath(): string {
  if (app.isPackaged) {
    return join(app.getAppPath(), "renderer", "index.html");
  }

  const mainDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(mainDir, "..", "..", "..");
  return join(repoRoot, "electron-app", "dist", "renderer", "index.html");
}

async function createWindow(): Promise<void> {
  if (runtimeOptions.headless) {
    log.info("Headless mode active; skip creating BrowserWindow");
    return;
  }

  mainWindow = new BrowserWindow({
    width: 960,
    height: 650,
    webPreferences: {
      preload: join(dirname(fileURLToPath(import.meta.url)), "preload.js"),
    },
  });
  await mainWindow.loadFile(resolveRendererPath());
}

function bootstrap(): void {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (mainWindow && !runtimeOptions.headless) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await ensureChatStore();

    runtimeManager.start();
    runtimeManager.once("ready", async () => {
      log.info(`Python runtime ready on port ${runtimeOptions.port}`);
      await createWindow();
      if (mainWindow) {
        mainWindow.webContents.send("runtime-ready", {
          port: runtimeOptions.port,
          host: runtimeOptions.host,
        });
      }
    });

    runtimeManager.on("stdout", (line) => {
      if (mainWindow) {
        mainWindow.webContents.send("runtime-stdout", line);
      }
    });

    runtimeManager.on("stderr", (line) => {
      if (mainWindow) {
        mainWindow.webContents.send("runtime-stderr", line);
      }
    });

    runtimeManager.on("exit", (payload) => {
      if (mainWindow) {
        mainWindow.webContents.send("runtime-exit", payload);
      }
    });

    await createWindow();
  });

  app.on("before-quit", () => {
    runtimeManager.stop();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

ipcMain.handle("runtime:get-options", () => runtimeOptions);

ipcMain.handle("sessions:load", async () => {
  const store = await ensureChatStore();
  return store.getAll();
});

ipcMain.handle("sessions:save", async (_event, data: StoredChatData) => {
  const store = await ensureChatStore();
  await store.setAll(data);
});

bootstrap();
