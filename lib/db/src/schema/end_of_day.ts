import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const endOfDayTable = pgTable("end_of_day", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  totalCashSales: numeric("total_cash_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalWalletSales: numeric("total_wallet_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalBankSales: numeric("total_bank_sales", { precision: 10, scale: 2 }).notNull().default("0"),
  totalRevenue: numeric("total_revenue", { precision: 10, scale: 2 }).notNull().default("0"),
  totalProfit: numeric("total_profit", { precision: 10, scale: 2 }).notNull().default("0"),
  totalTransactions: integer("total_transactions").notNull().default(0),
  notes: text("notes"),
  closedBy: integer("closed_by"),
  closedAt: timestamp("closed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEndOfDaySchema = createInsertSchema(endOfDayTable).omit({ id: true, createdAt: true });
export type InsertEndOfDay = z.infer<typeof insertEndOfDaySchema>;
export type EndOfDay = typeof endOfDayTable.$inferSelect;
