import type { StoredChatData } from "./types";

export interface RuntimeOptions {
  host: string;
  port: number;
  headless: boolean;
  pythonPath?: string;
  offline: boolean;
  allowGuest: boolean;
}

export interface SessionBridge {
  load(): Promise<StoredChatData>;
  save(data: StoredChatData): Promise<void>;
}

export interface AgentRelayBridge {
  getOptions(): Promise<RuntimeOptions>;
  onRuntimeReady(listener: (payload: RuntimeOptions) => void): void;
  onStdout(listener: (line: string) => void): void;
  onStderr(listener: (line: string) => void): void;
  onRuntimeExit(listener: (payload: unknown) => void): void;
  sessions: SessionBridge;
}
