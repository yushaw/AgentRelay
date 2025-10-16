import type { AgentRelayBridge } from "../../shared/ipc";

declare global {
  interface Window {
    agentrelay: AgentRelayBridge;
  }
}

export {};
