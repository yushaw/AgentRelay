export type { ChatMessage, ChatSession, Role } from "../../../shared/types";
export type { DeepSeekSettingsPayload } from "../../../shared/types";

export interface DeepSeekSettings {
  baseUrl: string;
  apiKey: string;
  apiKeyValid: boolean | null;
}

export interface RuntimeStatus {
  ready: boolean;
  host: string;
  port: number;
  model: string;
  lastUpdated: number | null;
}
