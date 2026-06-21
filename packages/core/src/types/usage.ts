export interface UsageEvent {
  id: string;
  keyId: string | null;
  vmodelId: string | null;
  backendId: string | null;
  backendModelId: string | null;
  endpoint: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  ttftMs: number | null;
  durationMs: number;
  tps: number | null;
  toolCallCount: number;
  statusCode: number;
  error: string | null;
  timestamp: number;
}

export type UsagePeriod = "hour" | "day" | "week" | "month";

export interface UsageRollup {
  id: string;
  period: UsagePeriod;
  /** ISO period bucket, e.g. "2024-01-15T14:00:00Z" for hour */
  bucket: string;
  keyId: string | null;
  vmodelId: string | null;
  backendId: string | null;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  errorCount: number;
  avgTtftMs: number | null;
  avgDurationMs: number | null;
  avgTps: number | null;
}
