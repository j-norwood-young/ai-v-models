CREATE TABLE `plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`version` text,
	`manifest` text NOT NULL,
	`config_schema` text,
	`bundle_path` text,
	`needs_response_buffer` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plugin_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`plugin_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text,
	`config` text,
	`order` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plugin_id`) REFERENCES `plugins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plugins_enabled` ON `plugins` (`enabled`);
--> statement-breakpoint
CREATE INDEX `idx_plugin_bindings_plugin` ON `plugin_bindings` (`plugin_id`);
--> statement-breakpoint
CREATE INDEX `idx_plugin_bindings_scope` ON `plugin_bindings` (`scope_type`, `scope_id`);
