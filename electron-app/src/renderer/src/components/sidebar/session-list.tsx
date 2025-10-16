import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types";
import dayjs from "@/lib/dayjs";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";
import { ReactNode } from "react";

interface SessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  trailingControls?: ReactNode;
}

export function SessionList({
  sessions,
  activeSessionId,
  onCreate,
  onSelect,
  onDelete,
  trailingControls,
}: SessionListProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">AgentRelay</p>
          <p className="text-xs text-muted-foreground">DeepSeek 多轮对话</p>
        </div>
      </div>
      <Button variant="secondary" className="w-full justify-start gap-2" onClick={onCreate}>
        <Plus className="h-4 w-4" /> 新建会话
      </Button>
      <Separator />
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-1">
          {sessions.length === 0 ? (
            <p className="rounded-md border border-dashed border-muted p-4 text-sm text-muted-foreground">
              暂无会话，点击“新建会话”开始吧。
            </p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "hover:bg-muted/40 text-muted-foreground",
                  )}
                >
                  <button className="flex-1 truncate text-left" onClick={() => onSelect(session.id)}>
                    <p className="truncate font-medium">{session.title || "未命名对话"}</p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(session.updatedAt).fromNow()}
                    </p>
                  </button>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="invisible p-1 text-muted-foreground hover:text-destructive group-hover:visible"
                          onClick={() => onDelete(session.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>删除会话</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
