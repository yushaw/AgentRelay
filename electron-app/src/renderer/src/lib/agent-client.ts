import type { DeepSeekSettingsPayload } from "../../shared/types";
import type { RuntimeStatus } from "@/types";

interface StatusResponse {
  service: string;
  version: string;
  metadata: {
    offlineMode: boolean;
    deepseek?: {
      apiKeySet?: boolean;
      baseUrl?: string;
      model?: string;
    };
  };
}

interface DeepSeekSettingsResponse {
  apiKeySet: boolean;
  apiKey: string | null;
  baseUrl: string;
}

export function runtimeBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

export async function fetchRuntimeStatus(host: string, port: number): Promise<Partial<RuntimeStatus> & { baseUrl?: string; apiKeyConfigured?: boolean }> {
  const response = await fetch(`${runtimeBaseUrl(host, port)}/status`);
  if (!response.ok) {
    throw new Error(`Status HTTP ${response.status}`);
  }
  const payload: StatusResponse = await response.json();
  const deepseek = payload.metadata.deepseek ?? {};
  return {
    ready: true,
    model: deepseek.model ?? "deepseek-chat",
    baseUrl: deepseek.baseUrl,
    apiKeyConfigured: deepseek.apiKeySet,
  };
}

export async function fetchDeepseekSettings(host: string, port: number): Promise<DeepSeekSettingsResponse> {
  const response = await fetch(`${runtimeBaseUrl(host, port)}/settings/deepseek`);
  if (!response.ok) {
    throw new Error(`Settings HTTP ${response.status}`);
  }
  return response.json();
}

export async function saveDeepseekSettings(
  host: string,
  port: number,
  payload: DeepSeekSettingsPayload,
): Promise<DeepSeekSettingsResponse> {
  const response = await fetch(`${runtimeBaseUrl(host, port)}/settings/deepseek`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Save settings HTTP ${response.status}`);
  }
  return response.json();
}

export async function resetDeepseekSettings(host: string, port: number): Promise<DeepSeekSettingsResponse> {
  const response = await fetch(`${runtimeBaseUrl(host, port)}/settings/deepseek`, { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Reset settings HTTP ${response.status}`);
  }
  return response.json();
}
