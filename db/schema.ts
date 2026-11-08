import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  kind: text('kind').notNull(),
  amountLuna: integer('amount_luna').notNull(),
  editionLimit: integer('edition_limit'),
  pickupCity: text('pickup_city'),
  payoutAddress: text('payout_address').notNull(),
  objectKey: text('object_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  active: integer('active').notNull().default(1),
  createdAt: integer('created_at').notNull(),
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').notNull().references(() => listings.id),
  claimHash: text('claim_hash').notNull(),
  txHash: text('tx_hash').unique(),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
  paidAt: integer('paid_at'),
});
