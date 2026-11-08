CREATE TABLE `product_files` (
  `listing_id` text PRIMARY KEY NOT NULL,
  `content_type` text NOT NULL,
  `content_base64` text NOT NULL,
  FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE CASCADE
);
