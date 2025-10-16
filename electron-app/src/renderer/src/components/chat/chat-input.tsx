import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  disabled?: boolean;
  canStop?: boolean;
}

export function ChatInput({ value, onChange, onSubmit, onStop, disabled, canStop }: ChatInputProps) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!disabled && value.trim()) {
          onSubmit();
        }
      }
    },
    [disabled, onSubmit, value],
  );

  return (
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
        className="min-h-[140px]"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>AgentRelay 将通过本地 Runtime 调用 DeepSeek 模型。</span>
        <div className="flex items-center gap-2">
          {onStop ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onStop}
              className={cn(!canStop && "hidden")}
            >
              停止生成
            </Button>
          ) : null}
          <Button disabled={disabled || !value.trim()} onClick={onSubmit}>
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
