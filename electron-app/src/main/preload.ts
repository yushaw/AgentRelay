import { contextBridge, ipcRenderer } from "electron";

import type { AgentRelayBridge, RuntimeOptions, SessionBridge } from "../shared/ipc";
import type { StoredChatData } from "../shared/types";

const sessions: SessionBridge = {
  load: async () => ipcRenderer.invoke("sessions:load") as Promise<StoredChatData>,
  save: async (data) => {
    await ipcRenderer.invoke("sessions:save", data);
  },
};

const bridge: AgentRelayBridge = {
  getOptions: async () => ipcRenderer.invoke("runtime:get-options"),
  onRuntimeReady: (listener) => {
    ipcRenderer.on("runtime-ready", (_event, payload: RuntimeOptions) => listener(payload));
  },
  onStdout: (listener) => {
    ipcRenderer.on("runtime-stdout", (_event, line: string) => listener(line));
  },
  onStderr: (listener) => {
    ipcRenderer.on("runtime-stderr", (_event, line: string) => listener(line));
  },
  onRuntimeExit: (listener) => {
    ipcRenderer.on("runtime-exit", (_event, payload: unknown) => listener(payload));
  },
  sessions,
};

contextBridge.exposeInMainWorld("agentrelay", bridge);
