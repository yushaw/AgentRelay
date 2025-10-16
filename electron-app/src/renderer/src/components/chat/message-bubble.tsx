import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  isCopied?: boolean;
  onCopy?: (content: string, id: string) => void;
}

export function MessageBubble({ message, isCopied, onCopy }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const bubbleClass = cn(
    "relative max-w-3xl rounded-2xl px-5 py-4 text-sm shadow-lg transition",
    isUser
      ? "bg-gradient-to-br from-primary/90 via-primary to-primary-foreground/90 text-primary-foreground"
      : "bg-gradient-to-br from-card/90 via-card/80 to-card/70 text-card-foreground border border-border/40",
  );

  return (
    <div className={cn("group flex", isUser ? "justify-end" : "justify-start")}>
      <div className={bubbleClass}>
        <div className="prose prose-invert max-w-none space-y-3 text-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
          {message.error ? (
            <p className="text-xs text-destructive">错误：{message.error}</p>
          ) : null}
          {message.isStreaming ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground/80">
              <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" />正在生成…
            </p>
          ) : null}
        </div>
        {onCopy ? (
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              "absolute -right-3 -top-3 hidden h-8 w-8 rounded-full bg-background/90 text-muted-foreground shadow group-hover:flex",
              isCopied && "!flex bg-primary text-primary-foreground",
            )}
            onClick={() => onCopy(message.content, message.id)}
          >
            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
