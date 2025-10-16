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

export interface StoredChatData {
  sessions: ChatSession[];
  activeSessionId: string | null;
}

export interface DeepSeekSettingsPayload {
  baseUrl: string;
  apiKey: string;
}
