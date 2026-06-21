-- ── Plugins ────────────────────────────────────────────────────────────────
CREATE TABLE `plugins` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `description` text,
  -- "npm:<pkg>", "github:<owner>/<repo>", "local:<path>"
  `source` text NOT NULL,
  `version` text,
  -- JSON: PluginManifest
  `manifest` text NOT NULL,
  -- JSON: ConfigSchema (from PluginManifest.configSchema)
  `config_schema` text,
  -- absolute path to the bundled JS file on disk
  `bundle_path` text,
  `needs_response_buffer` integer DEFAULT 0 NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

-- ── Plugin Bindings ─────────────────────────────────────────────────────────
-- One record per (plugin, scope) pair. Each binding can have its own config.
CREATE TABLE `plugin_bindings` (
  `id` text PRIMARY KEY NOT NULL,
  `plugin_id` text NOT NULL REFERENCES `plugins`(`id`) ON DELETE CASCADE,
  -- "global" | "vmodel" | "backend" | "key"
  `scope_type` text NOT NULL,
  -- null for global scope; otherwise the ID of the scoped entity
  `scope_id` text,
  -- JSON: per-binding config values (overrides or fills plugin defaults)
  `config` text,
  -- execution order (lower runs first)
  `order` integer DEFAULT 0 NOT NULL,
  `enabled` integer DEFAULT 1 NOT NULL,
  `created_at` integer NOT NULL
);

CREATE INDEX `idx_plugins_enabled` ON `plugins` (`enabled`);
CREATE INDEX `idx_plugin_bindings_plugin` ON `plugin_bindings` (`plugin_id`);
CREATE INDEX `idx_plugin_bindings_scope` ON `plugin_bindings` (`scope_type`, `scope_id`);
