import { Router, type IRouter } from "express";
import { authenticate, requireRole } from "../lib/auth.js";
import {
  db,
  usersTable,
  suppliersTable,
  productsTable,
  salesTable,
  saleItemsTable,
  stockMovementsTable,
  documentsTable,
  endOfDayTable,
  inventoryLossTable,
  backupsTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const BACKUP_DIR = path.join(process.cwd(), "uploads", "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

export async function createBackupFile(type: "manual" | "auto" | "pre-restore", userId?: number, notes?: string) {
  const [users, suppliers, products, sales, saleItems, stockMovements, documents, endOfDay, inventoryLoss] =
    await Promise.all([
      db.select().from(usersTable),
      db.select().from(suppliersTable),
      db.select().from(productsTable),
      db.select().from(salesTable),
      db.select().from(saleItemsTable),
      db.select().from(stockMovementsTable),
      db.select().from(documentsTable),
      db.select().from(endOfDayTable),
      db.select().from(inventoryLossTable),
    ]);

  const payload = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    type,
    tables: {
      users,
      suppliers,
      products,
      sales,
      saleItems,
      stockMovements,
      documents,
      endOfDay,
      inventoryLoss,
    },
  };

  const json = JSON.stringify(payload, null, 2);
  const filename = `backup_${type}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, json, "utf-8");
  const fileSize = Buffer.byteLength(json, "utf-8");

  const [record] = await db
    .insert(backupsTable)
    .values({ filename, filePath, fileSize, type, notes: notes ?? null, createdBy: userId ?? null })
    .returning();

  return record;
}

router.get("/backups/db-status", authenticate, async (_req, res): Promise<void> => {
  try {
    await db.execute("SELECT 1");
    const lastBackup = await db.select().from(backupsTable).orderBy(desc(backupsTable.createdAt)).limit(1);
    res.json({
      connected: true,
      lastBackupAt: lastBackup[0]?.createdAt ?? null,
      totalBackups: (await db.select().from(backupsTable)).length,
    });
  } catch {
    res.json({ connected: false, lastBackupAt: null, totalBackups: 0 });
  }
});

router.get("/backups", authenticate, requireRole("admin"), async (_req, res): Promise<void> => {
  const backups = await db
    .select({
      id: backupsTable.id,
      filename: backupsTable.filename,
      fileSize: backupsTable.fileSize,
      type: backupsTable.type,
      notes: backupsTable.notes,
      createdAt: backupsTable.createdAt,
      createdByName: usersTable.name,
    })
    .from(backupsTable)
    .leftJoin(usersTable, eq(backupsTable.createdBy, usersTable.id))
    .orderBy(desc(backupsTable.createdAt));
  res.json(backups);
});

router.post("/backups", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const record = await createBackupFile("manual", req.user!.userId, req.body?.notes ?? undefined);
  res.json(record);
});

router.get("/backups/:id/download", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [backup] = await db.select().from(backupsTable).where(eq(backupsTable.id, id));
  if (!backup) { res.status(404).json({ error: "Backup not found" }); return; }
  if (!fs.existsSync(backup.filePath)) { res.status(404).json({ error: "Backup file missing on disk" }); return; }
  res.setHeader("Content-Disposition", `attachment; filename="${backup.filename}"`);
  res.setHeader("Content-Type", "application/json");
  res.sendFile(backup.filePath);
});

router.delete("/backups/:id", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [backup] = await db.select().from(backupsTable).where(eq(backupsTable.id, id));
  if (!backup) { res.status(404).json({ error: "Backup not found" }); return; }
  try { if (fs.existsSync(backup.filePath)) fs.unlinkSync(backup.filePath); } catch { /* ignore */ }
  await db.delete(backupsTable).where(eq(backupsTable.id, id));
  res.json({ success: true });
});

router.post("/backups/restore", authenticate, requireRole("admin"), async (req, res): Promise<void> => {
  const { backupData } = req.body as { backupData: string };
  if (!backupData) { res.status(400).json({ error: "No backup data provided" }); return; }

  let parsed: {
    version: string;
    tables: {
      users?: Record<string, unknown>[];
      suppliers?: Record<string, unknown>[];
      products?: Record<string, unknown>[];
      sales?: Record<string, unknown>[];
      saleItems?: Record<string, unknown>[];
      stockMovements?: Record<string, unknown>[];
      documents?: Record<string, unknown>[];
      endOfDay?: Record<string, unknown>[];
      inventoryLoss?: Record<string, unknown>[];
    };
  };

  try {
    parsed = JSON.parse(backupData);
  } catch {
    res.status(400).json({ error: "Invalid backup file — could not parse JSON" });
    return;
  }

  if (!parsed.version || !parsed.tables) {
    res.status(400).json({ error: "Invalid backup format — missing version or tables" });
    return;
  }

  const safetyBackup = await createBackupFile("pre-restore", req.user!.userId, "Auto safety backup before restore");

  try {
    await db.transaction(async (tx) => {
      await tx.delete(inventoryLossTable);
      await tx.delete(endOfDayTable);
      await tx.delete(documentsTable);
      await tx.delete(stockMovementsTable);
      await tx.delete(saleItemsTable);
      await tx.delete(salesTable);
      await tx.delete(productsTable);
      await tx.delete(suppliersTable);
      await tx.delete(usersTable);

      const t = parsed.tables;
      if (t.users?.length) await tx.insert(usersTable).values(t.users as Parameters<typeof tx.insert>[0] extends { values: (v: infer V) => unknown } ? V : never);
      if (t.suppliers?.length) await tx.insert(suppliersTable).values(t.suppliers as never);
      if (t.products?.length) await tx.insert(productsTable).values(t.products as never);
      if (t.sales?.length) await tx.insert(salesTable).values(t.sales as never);
      if (t.saleItems?.length) await tx.insert(saleItemsTable).values(t.saleItems as never);
      if (t.stockMovements?.length) await tx.insert(stockMovementsTable).values(t.stockMovements as never);
      if (t.documents?.length) await tx.insert(documentsTable).values(t.documents as never);
      if (t.endOfDay?.length) await tx.insert(endOfDayTable).values(t.endOfDay as never);
      if (t.inventoryLoss?.length) await tx.insert(inventoryLossTable).values(t.inventoryLoss as never);
    });
  } catch (err) {
    res.status(500).json({ error: "Restore failed: " + (err instanceof Error ? err.message : "unknown error"), safetyBackupId: safetyBackup.id });
    return;
  }

  res.json({ success: true, safetyBackupId: safetyBackup.id, message: "Database restored successfully" });
});

export default router;
