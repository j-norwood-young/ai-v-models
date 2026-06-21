ALTER TABLE `users` ADD `must_change_password` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_secret` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `totp_enabled` integer DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE TABLE `pending_totp_logins` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pending_totp_token` ON `pending_totp_logins` (`token`);
--> statement-breakpoint
CREATE INDEX `idx_pending_totp_user` ON `pending_totp_logins` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_pending_totp_expires` ON `pending_totp_logins` (`expires_at`);
