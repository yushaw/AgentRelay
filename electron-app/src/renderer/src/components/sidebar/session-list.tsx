import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import type { ChatSession } from "@/types";
import { MessageSquarePlus, PencilLine, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  trailingControls?: ReactNode;
}

export function SessionList({
  sessions,
  activeSessionId,
  onCreate,
  onSelect,
  onDelete,
  onRename,
  trailingControls,
}: SessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (session: ChatSession) => {
    setEditingId(session.id);
    setDraft(session.title || "");
  };

  const commitEdit = () => {
    if (!editingId) return;
    const title = draft.trim() || "新的对话";
    onRename?.(editingId, title);
    setEditingId(null);
    setDraft("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquarePlus className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">AgentRelay</p>
          <p className="text-xs text-muted-foreground">DeepSeek 本地对话中心</p>
        </div>
      </div>
      <Button
        variant="secondary"
        className="w-full justify-start gap-2"
        size="sm"
        onClick={onCreate}
      >
        <Plus className="h-4 w-4" /> 新建会话
      </Button>
      <Separator className="border-border/60" />
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-2">
          {sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
              暂无会话。点击上方按钮开启新的探索。
            </p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingId === session.id;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 transition",
                    isActive
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "hover:bg-muted/30 text-muted-foreground",
                  )}
                >
                  <button
                    className="flex-1 truncate text-left"
                    onClick={() => onSelect(session.id)}
                  >
                    {isEditing ? (
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") commitEdit();
                          if (event.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                        className="w-full rounded-md border border-border/50 bg-background/70 px-2 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    ) : (
                      <>
                        <p className="truncate text-sm font-medium text-foreground">
                          {session.title || "未命名对话"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dayjs(session.updatedAt).fromNow()}
                        </p>
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                    {onRename ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                              onClick={() => (isEditing ? commitEdit() : startEdit(session))}
                            >
                              <PencilLine className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{isEditing ? "保存" : "重命名"}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                            onClick={() => onDelete(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>删除会话</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      {trailingControls}
    </div>
  );
}
