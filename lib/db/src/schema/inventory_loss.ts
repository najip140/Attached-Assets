import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryLossTable = pgTable("inventory_loss", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryLossSchema = createInsertSchema(inventoryLossTable).omit({ id: true, createdAt: true });
export type InsertInventoryLoss = z.infer<typeof insertInventoryLossSchema>;
export type InventoryLoss = typeof inventoryLossTable.$inferSelect;
