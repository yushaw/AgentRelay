import { nanoid } from "nanoid";
import { create } from "zustand";

import type { ChatMessage, ChatSession, DeepSeekSettings, RuntimeStatus } from "@/types";
import type { StoredChatData } from "../../../shared/types";
import dayjs from "@/lib/dayjs";

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  settings: DeepSeekSettings;
  runtime: RuntimeStatus;
  createSession: (title?: string) => string;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  renameSession: (sessionId: string, title: string) => void;
  appendMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, patch: Partial<ChatMessage>) => void;
  setSettings: (settings: Partial<DeepSeekSettings>) => void;
  setRuntimeStatus: (runtime: Partial<RuntimeStatus>) => void;
  hydrate: (data: StoredChatData) => void;
  getSnapshot: () => StoredChatData;
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

export const useAppStore = create<AppState>((set, get) => ({
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

  renameSession: (sessionId, title) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, title, updatedAt: now() } : session,
      ),
    }));
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

  hydrate: (data) => {
    const sessions = data.sessions.length ? data.sessions : [defaultSession];
    const activeSessionId =
      data.activeSessionId && sessions.some((session) => session.id === data.activeSessionId)
        ? data.activeSessionId
        : sessions[0]?.id ?? null;
    set({ sessions, activeSessionId });
  },

  getSnapshot: () => {
    const state = get();
    return {
      sessions: state.sessions,
      activeSessionId: state.activeSessionId,
    };
  },
}));
