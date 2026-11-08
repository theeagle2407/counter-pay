CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`kind` text NOT NULL,
	`amount_luna` integer NOT NULL,
	`payout_address` text NOT NULL,
	`object_key` text NOT NULL,
	`original_filename` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`claim_hash` text NOT NULL,
	`tx_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`paid_at` integer,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tx_hash_unique` ON `orders` (`tx_hash`);