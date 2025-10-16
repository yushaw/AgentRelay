export type Role = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  error?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

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
