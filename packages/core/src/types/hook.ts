export type HookType = "internal" | "external";
export type HookTrigger = "pre-request" | "post-completion";

export interface Hook {
  id: string;
  name: string;
  description: string | null;
  type: HookType;
  trigger: HookTrigger;
  enabled: boolean;
  /** For internal hooks: npm package name or local path */
  module: string | null;
  /** For external hooks: webhook URL */
  webhookUrl: string | null;
  /** Signing secret for external webhooks */
  webhookSecret: string | null;
  timeoutMs: number;
  /** JSON config passed to the hook */
  config: string | null;
  /** Package version (for NPM-installed hooks) */
  version: string | null;
  createdAt: number;
  updatedAt: number;
}

export type HookInsert = Omit<Hook, "id" | "createdAt" | "updatedAt">;
