import { contextBridge, ipcRenderer } from "electron";

type RuntimeOptions = {
  host: string;
  port: number;
  headless: boolean;
  offline: boolean;
  allowGuest: boolean;
};

contextBridge.exposeInMainWorld("agentrelay", {
  getOptions: async (): Promise<RuntimeOptions> =>
    ipcRenderer.invoke("runtime:get-options"),
  onRuntimeReady: (listener: (payload: RuntimeOptions) => void): void => {
    ipcRenderer.on("runtime-ready", (_event, payload: RuntimeOptions) =>
      listener(payload),
    );
  },
  onStdout: (listener: (line: string) => void): void => {
    ipcRenderer.on("runtime-stdout", (_event, line: string) => listener(line));
  },
  onStderr: (listener: (line: string) => void): void => {
    ipcRenderer.on("runtime-stderr", (_event, line: string) => listener(line));
  },
  onRuntimeExit: (listener: (payload: unknown) => void): void => {
    ipcRenderer.on("runtime-exit", (_event, payload: unknown) => listener(payload));
  },
});
