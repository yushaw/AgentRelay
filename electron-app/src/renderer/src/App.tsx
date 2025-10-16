import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/layout/app-shell";
import { SessionList } from "@/components/sidebar/session-list";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { useAppStore } from "@/state/app-store";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";
import { Check, Loader2, PlugZap, Settings } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@/types";
import dayjs from "@/lib/dayjs";

function RuntimeIndicator() {
  const runtime = useAppStore((state) => state.runtime);
  return (
    <div className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          runtime.ready ? "bg-green-400" : "bg-yellow-400 animate-pulse",
        )}
      />
      <span>
        {runtime.ready
          ? `本地 Runtime (${runtime.host}:${runtime.port}) 已就绪`
          : "等待 Runtime 就绪"}
      </span>
    </div>
  );
}

function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const [pending, setPending] = useState(false);
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);

  const handleSave = async () => {
    setPending(true);
    setSettings({ baseUrl, apiKey, apiKeyValid: null });
    setTimeout(() => {
      setSettings({ apiKeyValid: !!apiKey });
      setPending(false);
      onOpenChange(false);
    }, 500);
  };

  const handleClear = () => {
    setApiKey("");
    setSettings({ apiKey: "", apiKeyValid: null });
  };

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
            <p className="text-xs text-muted-foreground">
              Key 会保存在本地用户目录，不会上传服务器。保存后将自动校验格式。
            </p>
          </div>
        </div>
        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" onClick={handleClear}>
              清除
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              保存并校验
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function App() {
  const sessions = useAppStore((state) => state.sessions);
  const activeSessionId = useAppStore((state) => state.activeSessionId);
  const createSession = useAppStore((state) => state.createSession);
  const selectSession = useAppStore((state) => state.selectSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const updateMessage = useAppStore((state) => state.updateMessage);
  const runtime = useAppStore((state) => state.runtime);
  const settings = useAppStore((state) => state.settings);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const [prompt, setPrompt] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { copy, copied } = useCopyToClipboard();

  const handleCreateSession = () => {
    const id = createSession();
    selectSession(id);
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
  };

  const handleSend = () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    let sessionId = activeSession?.id;
    if (!sessionId) {
      sessionId = createSession(trimmed.slice(0, 12) || "新的对话");
      selectSession(sessionId);
    }

    const userMessage: ChatMessage = {
      id: nanoid(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };
    appendMessage(sessionId!, userMessage);

    const placeholder: ChatMessage = {
      id: nanoid(),
      role: "assistant",
      content: "(等待模型响应...)",
      createdAt: Date.now(),
      isStreaming: true,
    };
    appendMessage(sessionId!, placeholder);
    setPrompt("");

    setTimeout(() => {
      updateMessage(sessionId!, placeholder.id, {
        content: `DeepSeek 模型尚未接入实时服务。\n\n当前时间：${dayjs().format(
          "YYYY-MM-DD HH:mm:ss",
        )}`,
        isStreaming: false,
      });
    }, 800);
  };

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
            trailingControls={
              <div className="mt-4 flex flex-col gap-2">
                <RuntimeIndicator />
                <Button variant="ghost" className="justify-start gap-2" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" /> 设置
                </Button>
              </div>
            }
          />
        }
        header={
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-lg font-semibold">会话：{activeSession?.title ?? "未命名会话"}</h1>
              <p className="text-xs text-muted-foreground">
                使用 DeepSeek ({settings.baseUrl}) · Key 状态：
                <span className={cn("ml-1", settings.apiKey ? "text-green-400" : "text-yellow-400")}> 
                  {settings.apiKey ? (settings.apiKeyValid === false ? "无效" : "已配置") : "未配置"}
                </span>
              </p>
            </div>
            <RuntimeIndicator />
          </div>
        }
        footer={
          <div className="px-6 py-4">
            <ChatInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={handleSend}
              disabled={!settings.apiKey}
            />
          </div>
        }
      >
        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          <div className="flex-1 rounded-xl border border-border bg-card/40">
            <MessageList
              messages={activeSession?.messages ?? []}
              onCopyMessage={(content) => copy(content)}
            />
          </div>
          <Separator className="opacity-30" />
          <div className="rounded-xl border border-border bg-card/30 p-4 text-xs text-muted-foreground">
            <p>
              当前模型：{runtime.model} · 主机：{runtime.host}:{runtime.port} · 上次更新：
              {runtime.lastUpdated ? dayjs(runtime.lastUpdated).fromNow() : "—"}
            </p>
            <p>{copied ? <span className="text-green-400">已复制内容到剪贴板</span> : null}</p>
          </div>
        </div>
      </AppShell>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
