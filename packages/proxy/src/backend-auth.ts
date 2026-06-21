import { decrypt } from "@ai-v-models/core";

export interface BackendAuthFields {
  keyMode: string;
  encryptedApiKey: string | null;
}

export function backendAuthHeaders(
  backend: BackendAuthFields,
  masterKey: Buffer,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (backend.keyMode === "abstraction" && backend.encryptedApiKey) {
    headers["Authorization"] = `Bearer ${decrypt(backend.encryptedApiKey, masterKey)}`;
  }
  return headers;
}
