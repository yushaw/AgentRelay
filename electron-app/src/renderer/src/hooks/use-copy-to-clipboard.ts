import { useCallback, useState } from "react";

export function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = useCallback(async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id ?? null);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (error) {
      console.error("Clipboard copy failed", error);
    }
  }, []);

  return { copiedId, copy };
}
