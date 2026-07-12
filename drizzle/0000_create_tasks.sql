CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`category` text DEFAULT 'PC' NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'Media' NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`next_step` text DEFAULT '' NOT NULL,
	`if_then` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text
);
