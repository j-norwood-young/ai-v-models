CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`suspended` integer DEFAULT false NOT NULL,
	`suspended_reason` text,
	`expires_at` integer,
	`allowed_models` text,
	`allow_tool_calling` integer DEFAULT true NOT NULL,
	`allow_vision` integer DEFAULT false NOT NULL,
	`allow_embeddings` integer DEFAULT false NOT NULL,
	`rate_limit_rpm` integer,
	`token_budget_hour` integer,
	`token_budget_day` integer,
	`token_budget_week` integer,
	`token_budget_month` integer,
	`log_requests` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_prefix` ON `api_keys` (`prefix`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_keys_hash` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_keys_enabled` ON `api_keys` (`enabled`);--> statement-breakpoint
CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`prefix` text NOT NULL,
	`user_id` text,
	`enabled` integer DEFAULT true NOT NULL,
	`expires_at` integer,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_api_tokens_hash` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_api_tokens_user` ON `api_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`username` text,
	`action` text NOT NULL,
	`resource_type` text,
	`resource_id` text,
	`detail` text,
	`ip_address` text,
	`timestamp` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_log_user` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_timestamp` ON `audit_log` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_audit_log_resource` ON `audit_log` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE TABLE `backends` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`host_name` text NOT NULL,
	`provider` text NOT NULL,
	`base_url` text NOT NULL,
	`key_mode` text DEFAULT 'passthrough' NOT NULL,
	`encrypted_api_key` text,
	`enabled` integer DEFAULT true NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`max_concurrency` integer DEFAULT 10 NOT NULL,
	`health_check_enabled` integer DEFAULT true NOT NULL,
	`last_health_check` integer,
	`last_health_status` text,
	`last_latency_ms` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `backends_name_unique` ON `backends` (`name`);--> statement-breakpoint
CREATE INDEX `idx_backends_enabled` ON `backends` (`enabled`);--> statement-breakpoint
CREATE TABLE `hooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`trigger` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`module` text,
	`webhook_url` text,
	`webhook_secret` text,
	`timeout_ms` integer DEFAULT 5000 NOT NULL,
	`config` text,
	`version` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `hooks_name_unique` ON `hooks` (`name`);--> statement-breakpoint
CREATE TABLE `request_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`key_id` text,
	`vmodel_id` text,
	`backend_id` text,
	`backend_model_id` text,
	`endpoint` text NOT NULL,
	`method` text NOT NULL,
	`status_code` integer NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`ttft_ms` integer,
	`duration_ms` integer NOT NULL,
	`tps` real,
	`tool_call_count` integer DEFAULT 0 NOT NULL,
	`error` text,
	`request_size` integer DEFAULT 0 NOT NULL,
	`response_size` integer DEFAULT 0 NOT NULL,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vmodel_id`) REFERENCES `vmodels`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`backend_id`) REFERENCES `backends`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_request_logs_key` ON `request_logs` (`key_id`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_vmodel` ON `request_logs` (`vmodel_id`);--> statement-breakpoint
CREATE INDEX `idx_request_logs_timestamp` ON `request_logs` (`timestamp`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`user_agent` text,
	`ip_address` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_sessions_token` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sessions_expires` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `token_budget_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`key_id` text NOT NULL,
	`period` text NOT NULL,
	`bucket` text NOT NULL,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_budget_counters_unique` ON `token_budget_counters` (`key_id`,`period`,`bucket`);--> statement-breakpoint
CREATE INDEX `idx_budget_counters_key` ON `token_budget_counters` (`key_id`);--> statement-breakpoint
CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`key_id` text,
	`vmodel_id` text,
	`backend_id` text,
	`backend_model_id` text,
	`endpoint` text NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`ttft_ms` integer,
	`duration_ms` integer NOT NULL,
	`tps` real,
	`tool_call_count` integer DEFAULT 0 NOT NULL,
	`status_code` integer NOT NULL,
	`error` text,
	`timestamp` integer NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vmodel_id`) REFERENCES `vmodels`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`backend_id`) REFERENCES `backends`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_usage_events_key` ON `usage_events` (`key_id`);--> statement-breakpoint
CREATE INDEX `idx_usage_events_vmodel` ON `usage_events` (`vmodel_id`);--> statement-breakpoint
CREATE INDEX `idx_usage_events_backend` ON `usage_events` (`backend_id`);--> statement-breakpoint
CREATE INDEX `idx_usage_events_timestamp` ON `usage_events` (`timestamp`);--> statement-breakpoint
CREATE TABLE `usage_rollups` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`bucket` text NOT NULL,
	`key_id` text,
	`vmodel_id` text,
	`backend_id` text,
	`request_count` integer DEFAULT 0 NOT NULL,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`avg_ttft_ms` real,
	`avg_duration_ms` real,
	`avg_tps` real
);
--> statement-breakpoint
CREATE INDEX `idx_rollups_period_bucket` ON `usage_rollups` (`period`,`bucket`);--> statement-breakpoint
CREATE INDEX `idx_rollups_key` ON `usage_rollups` (`key_id`);--> statement-breakpoint
CREATE INDEX `idx_rollups_vmodel` ON `usage_rollups` (`vmodel_id`);--> statement-breakpoint
CREATE INDEX `idx_rollups_backend` ON `usage_rollups` (`backend_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'viewer' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_username` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `vmodel_backends` (
	`id` text PRIMARY KEY NOT NULL,
	`vmodel_id` text NOT NULL,
	`backend_id` text NOT NULL,
	`backend_model_id` text NOT NULL,
	`weight` integer DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vmodel_id`) REFERENCES `vmodels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`backend_id`) REFERENCES `backends`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vmodel_backends_vmodel` ON `vmodel_backends` (`vmodel_id`);--> statement-breakpoint
CREATE INDEX `idx_vmodel_backends_backend` ON `vmodel_backends` (`backend_id`);--> statement-breakpoint
CREATE TABLE `vmodel_hooks` (
	`id` text PRIMARY KEY NOT NULL,
	`vmodel_id` text NOT NULL,
	`hook_id` text NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`vmodel_id`) REFERENCES `vmodels`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`hook_id`) REFERENCES `hooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vmodels` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`balancing_strategy` text DEFAULT 'session-pin' NOT NULL,
	`streaming` integer DEFAULT true NOT NULL,
	`allow_tool_calling` integer DEFAULT true NOT NULL,
	`allow_vision` integer DEFAULT false NOT NULL,
	`allow_embeddings` integer DEFAULT false NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vmodels_model_id_unique` ON `vmodels` (`model_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_vmodels_model_id` ON `vmodels` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_vmodels_enabled` ON `vmodels` (`enabled`);