import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy?: (content: string) => void;
}

export function MessageBubble({ message, onCopy }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const bubbleClass = cn(
    "relative max-w-3xl rounded-2xl px-5 py-3 text-sm shadow-sm transition",
    isUser
      ? "bg-primary text-primary-foreground"
      : "bg-muted/80 text-muted-foreground border border-border/40",
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
        </div>
        {onCopy ? (
          <Button
            size="icon"
            variant="ghost"
            className="absolute -right-3 -top-3 hidden h-8 w-8 rounded-full bg-background/90 text-muted-foreground shadow group-hover:flex"
            onClick={() => onCopy(message.content)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
