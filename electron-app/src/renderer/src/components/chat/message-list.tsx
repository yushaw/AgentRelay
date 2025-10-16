import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  copiedMessageId?: string | null;
  onCopyMessage?: (content: string, id: string) => void;
}

export function MessageList({ messages, copiedMessageId, onCopyMessage }: MessageListProps) {
  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-4">
        {sorted.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isCopied={copiedMessageId === message.id}
            onCopy={onCopyMessage}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
