export interface RequestLog {
  id: string;
  keyId: string | null;
  vmodelId: string | null;
  backendId: string | null;
  backendModelId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  ttftMs: number | null;
  durationMs: number;
  tps: number | null;
  toolCallCount: number;
  error: string | null;
  requestSize: number;
  responseSize: number;
  timestamp: number;
}
