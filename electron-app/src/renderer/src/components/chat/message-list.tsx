import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  messages: ChatMessage[];
  onCopyMessage?: (content: string) => void;
}

export function MessageList({ messages, onCopyMessage }: MessageListProps) {
  const sorted = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  return (
    <ScrollArea className="h-full p-6">
      <div className="space-y-4">
        {sorted.map((message) => (
          <MessageBubble key={message.id} message={message} onCopy={onCopyMessage} />
        ))}
      </div>
    </ScrollArea>
  );
}
