import { app } from "electron";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { StoredChatData, ChatSession } from "../shared/types";

export class ChatStore {
  private data: StoredChatData = { sessions: [], activeSessionId: null };
  private filePath: string;
  private initialised = false;

  constructor() {
    const userData = app.getPath("userData");
    this.filePath = join(userData, "sessions.json");
  }

  async init(): Promise<void> {
    if (this.initialised) return;
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      this.data = JSON.parse(content);
    } catch (error) {
      await this.persist();
    }
    this.initialised = true;
  }

  getAll(): StoredChatData {
    return this.data;
  }

  async setAll(payload: StoredChatData): Promise<void> {
    this.data = payload;
    await this.persist();
  }

  async createSession(session: ChatSession): Promise<void> {
    this.data.sessions = [session, ...this.data.sessions];
    this.data.activeSessionId = session.id;
    await this.persist();
  }

  async updateSession(session: ChatSession): Promise<void> {
    this.data.sessions = this.data.sessions.map((existing) =>
      existing.id === session.id ? session : existing,
    );
    await this.persist();
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.data.sessions = this.data.sessions.filter((session) => session.id !== sessionId);
    if (this.data.activeSessionId === sessionId) {
      this.data.activeSessionId = this.data.sessions[0]?.id ?? null;
    }
    await this.persist();
  }

  async setActiveSession(sessionId: string | null): Promise<void> {
    this.data.activeSessionId = sessionId;
    await this.persist();
  }

  private async persist(): Promise<void> {
    const dir = dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }
}
