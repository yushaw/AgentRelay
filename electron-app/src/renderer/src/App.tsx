import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { MessageSquarePlus, Plus, Settings, Trash2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SessionPreview {
  id: string;
  title: string;
  updatedAt: string;
}

const mockSessions: SessionPreview[] = [
  { id: "1", title: "欢迎使用 AgentRelay", updatedAt: "刚刚" },
  { id: "2", title: "产品需求梳理", updatedAt: "2 小时前" },
];

const mockMessages: ChatMessage[] = [
  { id: "m1", role: "assistant", content: "你好！我是 AgentRelay，随时准备为你提供 DeepSeek 对话体验。" },
  { id: "m2", role: "user", content: "可以简单介绍一下今天的计划吗？" },
  {
    id: "m3",
    role: "assistant",
    content: "当然。我们将首先确认需求，然后接入 DeepSeek API 并完成界面迭代，最后打包测试。",
  },
];

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(mockSessions[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [apiBase, setApiBase] = useState("https://api.deepseek.com/v1");
  const [apiKey, setApiKey] = useState("");

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-72 flex-col border-r border-border bg-background/60 p-4 md:flex">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">AgentRelay</p>
            <p className="text-xs text-muted-foreground">本地 DeepSeek 对话中心</p>
          </div>
        </div>
        <Button className="mt-4 w-full justify-start gap-2" variant="secondary">
          <Plus className="h-4 w-4" />
          新建会话
        </Button>
        <Separator className="my-4" />
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-1">
            {mockSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                  activeSessionId === session.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/40 text-muted-foreground",
                )}
              >
                <span className="truncate">{session.title}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>删除会话</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
            设置
          </Button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">多轮对话</h1>
            <p className="text-sm text-muted-foreground">使用 DeepSeek OpenAI 接口，与本地 Agent 协同工作</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Runtime: 本地 127.0.0.1</span>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4" /> 设置
            </Button>
          </div>
        </header>

        <section className="flex flex-1 gap-4 overflow-hidden p-4">
          <div className="flex-1 rounded-xl border border-border bg-card/40">
            <ScrollArea className="h-full p-6">
              <div className="space-y-4">
                {mockMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-3xl rounded-lg px-4 py-3 text-sm shadow-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </section>

        <footer className="border-t border-border bg-background/80 p-4">
          <div className="flex items-end gap-3">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="请输入对话内容（Enter 发送，Shift+Enter 换行）"
              className="min-h-[120px] flex-1"
            />
            <div className="flex flex-col gap-2">
              <Button disabled={!prompt.trim()}>发送</Button>
              <Button variant="ghost" size="sm">
                停止
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            AgentRelay 将通过 LangGraph Runtime 调用 DeepSeek 模型，可在设置中更新 API Key 与 Base URL。
          </p>
        </footer>
      </main>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>模型设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-base">API Base URL</Label>
              <Input
                id="api-base"
                value={apiBase}
                onChange={(event) => setApiBase(event.target.value)}
                placeholder="https://api.deepseek.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Textarea
                id="api-key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setApiKey("")}>清除</Button>
              <Button>保存并校验</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
