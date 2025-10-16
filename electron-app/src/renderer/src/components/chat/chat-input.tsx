import { useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Paperclip, Sparkles } from "lucide-react";

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
    <div className="space-y-3 rounded-xl border border-border/60 bg-layer/70 p-4 shadow-inner">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled>
            <Paperclip className="h-4 w-4" />
            <span className="sr-only">附件（即将推出）</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled>
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">预设提示</span>
          </Button>
        </div>
        <span>Enter 发送 · Shift+Enter 换行</span>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="向代理描述你的场景或问题…"
        className="min-h-[140px] bg-background/60"
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
