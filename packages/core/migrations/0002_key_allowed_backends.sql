ALTER TABLE `api_keys` ADD `allowed_backends` text;
--> statement-breakpoint
UPDATE `api_keys` SET `allowed_backends` = '[]' WHERE `allowed_models` IS NOT NULL;
