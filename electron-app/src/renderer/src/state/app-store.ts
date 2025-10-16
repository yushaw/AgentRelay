import { nanoid } from "nanoid";
import { create } from "zustand";
import dayjs from "dayjs";

import type { ChatMessage, ChatSession, DeepSeekSettings, RuntimeStatus } from "@/types";

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  settings: DeepSeekSettings;
  runtime: RuntimeStatus;
  createSession: (title?: string) => string;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  setSettings: (settings: Partial<DeepSeekSettings>) => void;
  setRuntimeStatus: (runtime: Partial<RuntimeStatus>) => void;
}

const now = () => dayjs().valueOf();

const defaultSession: ChatSession = {
  id: nanoid(),
  title: "新的对话",
  createdAt: now(),
  updatedAt: now(),
  messages: [
    {
      id: nanoid(),
      role: "assistant",
      content: "你好！填写 DeepSeek API Key 后即可开始对话。",
      createdAt: now(),
    },
  ],
};

const defaultSettings: DeepSeekSettings = {
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  apiKeyValid: null,
};

const defaultRuntime: RuntimeStatus = {
  ready: false,
  host: "127.0.0.1",
  port: 51055,
  model: "deepseek-chat",
  lastUpdated: null,
};

export const useAppStore = create<AppState>((set) => ({
  sessions: [defaultSession],
  activeSessionId: defaultSession.id,
  settings: defaultSettings,
  runtime: defaultRuntime,

  createSession: (title = "新的对话") => {
    const session: ChatSession = {
      id: nanoid(),
      title,
      createdAt: now(),
      updatedAt: now(),
      messages: [],
    };
    set((state) => ({
      sessions: [session, ...state.sessions],
      activeSessionId: session.id,
    }));
    return session.id;
  },

  selectSession: (sessionId) => {
    set({ activeSessionId: sessionId });
  },

  deleteSession: (sessionId) => {
    set((state) => {
      const sessions = state.sessions.filter((session) => session.id !== sessionId);
      const activeSessionId =
        state.activeSessionId === sessionId ? sessions[0]?.id ?? null : state.activeSessionId;
      return { sessions, activeSessionId };
    });
  },

  appendMessage: (sessionId, message) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: [...session.messages, message],
          updatedAt: now(),
        };
      }),
    }));
  },

  updateMessage: (sessionId, messageId, patch) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          messages: session.messages.map((message) =>
            message.id === messageId ? { ...message, ...patch } : message,
          ),
          updatedAt: now(),
        };
      }),
    }));
  },

  setSettings: (settings) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
    }));
  },

  setRuntimeStatus: (runtime) => {
    set((state) => ({
      runtime: { ...state.runtime, ...runtime, lastUpdated: now() },
    }));
  },
}));
