import { pgTable, serial, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  filename: varchar("filename", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  type: varchar("type", { length: 20 }).notNull().default("manual"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Backup = typeof backupsTable.$inferSelect;
