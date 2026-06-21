export type PluginScopeType = "global" | "vmodel" | "backend" | "key";

export interface Plugin {
  id: string;
  name: string;
  description: string | null;
  /** "npm:<pkg>" | "github:<owner>/<repo>" | "local:<path>" */
  source: string;
  version: string | null;
  /** Serialised PluginManifest */
  manifest: string;
  /** Serialised ConfigSchema */
  configSchema: string | null;
  /** Absolute path to bundled JS on disk */
  bundlePath: string | null;
  needsResponseBuffer: boolean;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PluginBinding {
  id: string;
  pluginId: string;
  scopeType: PluginScopeType;
  scopeId: string | null;
  /** Serialised per-binding config values */
  config: string | null;
  order: number;
  enabled: boolean;
  createdAt: number;
}

export interface PluginWithBindings extends Plugin {
  bindings: PluginBinding[];
}

/** Runtime representation of a binding with resolved config object */
export interface ResolvedBinding {
  bindingId: string;
  pluginId: string;
  pluginName: string;
  bundlePath: string;
  needsResponseBuffer: boolean;
  /** JSON-parsed ConfigSchema */
  configSchema: Record<string, unknown>;
  config: Record<string, unknown>;
  order: number;
}
