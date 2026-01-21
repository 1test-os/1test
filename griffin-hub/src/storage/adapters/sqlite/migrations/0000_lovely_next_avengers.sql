CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`location` text NOT NULL,
	`status` text NOT NULL,
	`last_heartbeat` integer NOT NULL,
	`registered_at` integer NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`organization` text NOT NULL,
	`project` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`frequency` text NOT NULL,
	`locations` text,
	`nodes` text NOT NULL,
	`edges` text NOT NULL,
	`environment` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`execution_group_id` text NOT NULL,
	`location` text NOT NULL,
	`environment` text NOT NULL,
	`triggered_by` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`status` text NOT NULL,
	`duration_ms` integer,
	`success` integer,
	`errors` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE no action
);
