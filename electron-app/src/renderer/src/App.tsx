import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AppShell } from "@/components/layout/app-shell";
import { SessionList } from "@/components/sidebar/session-list";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { useAppStore } from "@/state/app-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import {
  fetchDeepseekSettings,
  fetchRuntimeStatus,
  resetDeepseekSettings,
  saveDeepseekSettings,
  runtimeBaseUrl,
} from "@/lib/agent-client";
import type { ChatMessage } from "@/types";
import type { StoredChatData } from "../../shared/types";
import { Loader2, Settings } from "lucide-react";

function RuntimeIndicator() {
  const runtime = useAppStore((state) => state.runtime);
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-layer/70 px-3 py-1 text-xs shadow-sm">
      {runtime.ready ? (
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-yellow-300" />
      )}
      <span className="text-muted-foreground">
        {runtime.ready
          ? `Runtime ${runtime.host}:${runtime.port}`
          : "等待本地 Runtime 启动"}
      </span>
    </div>
  );
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const runtime = useAppStore((state) => state.runtime);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBaseUrl(settings.baseUrl);
      setApiKey(settings.apiKey);
      setError(null);
    }
  }, [open, settings.baseUrl, settings.apiKey]);

  const handleSave = async () => {
    if (!runtime.host || !runtime.port) return;
    setPending(true);
    setError(null);
    try {
      const result = await saveDeepseekSettings(runtime.host, runtime.port, {
        baseUrl,
        apiKey,
      });
      setSettings({
        baseUrl: result.baseUrl,
        apiKey: result.apiKey ?? "",
        apiKeyValid: result.apiKeySet,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError("保存失败，请检查网络或运行状态。");
      setSettings({ apiKeyValid: false });
    } finally {
      setPending(false);
    }
  };

  const handleClear = async () => {
    if (!runtime.host || !runtime.port) return;
    setPending(true);
    setError(null);
    try {
      const result = await resetDeepseekSettings(runtime.host, runtime.port);
      setSettings({
        baseUrl: result.baseUrl,
        apiKey: "",
        apiKeyValid: result.apiKeySet,
      });
      setApiKey("");
      setBaseUrl(result.baseUrl);
    } catch (err) {
      console.error(err);
      setError("清除失败，请稍后重试。");
    } finally {
      setPending(false);
    }
  };

  const helperText = settings.apiKey
    ? settings.apiKeyValid === false
      ? "API Key 校验失败，请重新保存。"
      : "API Key 已保存本地。"
    : "尚未配置 API Key。";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>模型设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="base-url">API Base URL</Label>
            <Input
              id="base-url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              placeholder="https://api.deepseek.com/v1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key">DeepSeek API Key</Label>
            <ScrollArea className="max-h-40 rounded-md border border-border">
              <textarea
                id="api-key"
                className="h-32 w-full bg-transparent p-3 text-sm outline-none"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
              />
            </ScrollArea>
            <p className="text-xs text-muted-foreground">{helperText}</p>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={handleClear} disabled={pending}>
              清除
            </Button>
            <Button onClick={handleSave} disabled={pending || !runtime.ready}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存并校验
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ActiveStream {
  sessionId: string;
  messageId: string;
  runId: string;
  buffer: string;
}

export default function App() {
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const createSession = useAppStore((state) => state.createSession);
  const renameSession = useAppStore((state) => state.renameSession);
  const selectSession = useAppStore((state) => state.selectSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const updateMessage = useAppStore((state) => state.updateMessage);
  const hydrate = useAppStore((state) => state.hydrate);
  const getSnapshot = useAppStore((state) => state.getSnapshot);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const runtime = useAppStore((state) => state.runtime);
  const setRuntimeStatus = useAppStore((state) => state.setRuntimeStatus);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const hydrationRef = useRef(false);
  const { copy, copiedId } = useCopyToClipboard();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [stream, setStream] = useState<ActiveStream | null>(null);
  const [sending, setSending] = useState(false);

  const refreshDeepseekState = async (host: string, port: number) => {
    try {
      const [status, deepseek] = await Promise.all([
        fetchRuntimeStatus(host, port),
        fetchDeepseekSettings(host, port),
      ]);
      setRuntimeStatus({
        model: status.model ?? "deepseek-chat",
        ready: true,
      });
      setSettings({
        baseUrl: deepseek.baseUrl,
        apiKey: deepseek.apiKey ?? "",
        apiKeyValid: deepseek.apiKeySet,
      });
    } catch (error) {
      console.warn("获取 Runtime 状态失败", error);
    }
  };

  useEffect(() => {
    async function loadSessions() {
      try {
        const result = await window.agentrelay.sessions.load();
        hydrate(result);
      } catch (error) {
        console.warn("无法加载会话历史", error);
      } finally {
        hydrationRef.current = true;
        setHydrated(true);
      }
    }
    loadSessions();
  }, [hydrate]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useAppStore.subscribe(
      (state) => state.getSnapshot(),
      (snapshot: StoredChatData) => {
        if (!hydrationRef.current) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          window.agentrelay.sessions.save(snapshot).catch((error) => {
            console.warn("保存会话失败", error);
          });
        }, 250);
      },
    );
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function syncInitialRuntime() {
      const options = await window.agentrelay.getOptions();
      setRuntimeStatus({ host: options.host, port: options.port });
    }
    syncInitialRuntime();

    window.agentrelay.onRuntimeReady(async (payload) => {
      setRuntimeStatus({ ready: true, host: payload.host, port: payload.port });
      await refreshDeepseekState(payload.host, payload.port);
    });

    window.agentrelay.onRuntimeExit(() => {
      setRuntimeStatus({ ready: false });
    });
  }, [setRuntimeStatus]);

  const handleCreateSession = () => {
    const id = createSession();
    selectSession(id);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
  };

  const handleSend = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || sending) return;
    if (!runtime.host || !runtime.port) return;

    setSending(true);

    let sessionId = activeSession?.id;
    if (!sessionId) {
      sessionId = createSession(trimmed.slice(0, 18) || "新的对话");
      selectSession(sessionId);
    }

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    appendMessage(sessionId!, userMessage);

    const assistantMessage: ChatMessage = {
      id: nanoid(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      isStreaming: true,
    };
    appendMessage(sessionId!, assistantMessage);
    setPrompt("");

    const state = useAppStore.getState();
    const session = state.sessions.find((item) => item.id === sessionId);
    if (session && (!session.title || session.title === "新的对话")) {
      renameSession(session.id, trimmed.slice(0, 20));
    }
    const conversation = (session?.messages ?? []).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const runId = crypto.randomUUID ? crypto.randomUUID() : nanoid();

    try {
      const response = await fetch(`${runtimeBaseUrl(runtime.host, runtime.port)}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId,
          agentId: "workflow.chat.deepseek",
          prompt: "You are AgentRelay assistant.",
          conversation,
          constraints: { temperature: 0.2 },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      setStream({ sessionId: sessionId!, messageId: assistantMessage.id, runId, buffer: "" });
      const eventSource = new EventSource(
        `${runtimeBaseUrl(runtime.host, runtime.port)}/runs/${runId}/events`,
      );
      eventSourceRef.current = eventSource;
      eventSource.addEventListener("run.delta", (event) => {
        const data = JSON.parse(event.data);
        if (!data.text) return;
        setStream((current) => {
          if (!current || current.runId !== runId) return current;
          const nextBuffer = current.buffer + data.text;
          updateMessage(current.sessionId, current.messageId, {
            content: nextBuffer,
            isStreaming: true,
          });
          return { ...current, buffer: nextBuffer };
        });
      });
      eventSource.addEventListener("run.completed", (event) => {
        const data = JSON.parse(event.data);
        setStream((current) => {
          if (!current || current.runId !== runId) return current;
          const text = data.response || current.buffer;
          updateMessage(current.sessionId, current.messageId, {
            content: text,
            isStreaming: false,
          });
          return null;
        });
        eventSource.close();
        eventSourceRef.current = null;
      });
      eventSource.addEventListener("run.failed", (event) => {
        const data = JSON.parse(event.data);
        setStream(null);
        updateMessage(sessionId!, assistantMessage.id, {
          content: data.message || "对话失败",
          error: data.message,
          isStreaming: false,
        });
        eventSource.close();
        eventSourceRef.current = null;
      });
      eventSource.onerror = () => {
        setStream(null);
        updateMessage(sessionId!, assistantMessage.id, {
          error: "事件流中断",
          isStreaming: false,
        });
        eventSource.close();
        eventSourceRef.current = null;
      };
    } catch (error) {
      console.error(error);
      updateMessage(sessionId!, assistantMessage.id, {
        content: "",
        error: "调用 DeepSeek 失败，请稍后重试。",
        isStreaming: false,
      });
      setStream(null);
    } finally {
      setSending(false);
    }
  };

  const handleStop = async () => {
    if (!stream || !runtime.host || !runtime.port) return;
    try {
      await fetch(
        `${runtimeBaseUrl(runtime.host, runtime.port)}/runs/${stream.runId}/cancel`,
        {
          method: "POST",
        },
      );
    } catch (error) {
      console.warn("取消运行失败", error);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    updateMessage(stream.sessionId, stream.messageId, {
      content: stream.buffer || "运行已取消",
      isStreaming: false,
    });
    setStream(null);
    setSending(false);
  };

  useEffect(() => () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }, []);

  return (
    <>
      <AppShell
        sidebar={
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onCreate={handleCreateSession}
            onSelect={selectSession}
            onDelete={handleDeleteSession}
            onRename={renameSession}
            trailingControls={
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p>会话与密钥仅存储于本地设备。</p>
                <p>双击标题或使用右侧图标即可重命名或删除会话。</p>
              </div>
            }
          />
        }
        header={
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-lg font-semibold">会话：{activeSession?.title ?? "未命名会话"}</h1>
              <p className="text-xs text-muted-foreground">
                使用 DeepSeek · Base URL: {settings.baseUrl || "未配置"} · Key 状态:
                <span
                  className={cn(
                    "ml-1",
                    settings.apiKey
                      ? settings.apiKeyValid === false
                        ? "text-yellow-400"
                        : "text-green-400"
                      : "text-yellow-400",
                  )}
                >
                  {settings.apiKey
                    ? settings.apiKeyValid === false
                      ? "校验失败"
                      : "已配置"
                    : "未配置"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" /> 设置
              </Button>
              <RuntimeIndicator />
            </div>
          </div>
        }
        footer={
          <div className="px-6 py-4">
            <ChatInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSend}
              onStop={stream ? handleStop : undefined}
              canStop={!!stream}
              disabled={!settings.apiKey || !runtime.ready || sending}
            />
          </div>
        }
      >
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="flex-1 rounded-xl border border-border bg-card/40">
            <MessageList
              messages={activeSession?.messages ?? []}
              copiedMessageId={copiedId}
              onCopyMessage={(content, id) => copy(content, id)}
            />
          </div>
          <Separator className="opacity-30" />
          <div className="rounded-xl border border-border bg-card/30 p-4 text-xs text-muted-foreground">
            <p>
              模型：{runtime.model} · 主机：{runtime.host}:{runtime.port} · 上次更新：
              {runtime.lastUpdated ? dayjs(runtime.lastUpdated).fromNow() : "—"}
            </p>
            {copiedId ? <p className="text-green-400">已复制消息到剪贴板</p> : null}
          </div>
        </div>
      </AppShell>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
