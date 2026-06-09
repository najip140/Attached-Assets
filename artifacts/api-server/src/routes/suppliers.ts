import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import {
  CreateSupplierBody,
  UpdateSupplierBody,
  UpdateSupplierParams,
  DeleteSupplierParams,
} from "@workspace/api-zod";
import { authenticate, requireRole } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

function formatSupplier(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    contact: s.contact,
    email: s.email,
    phone: s.phone,
    address: s.address,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/suppliers", async (_req, res): Promise<void> => {
  const rows = await db.select().from(suppliersTable).orderBy(suppliersTable.name);
  res.json(rows.map(formatSupplier));
});

router.post("/suppliers", requireRole("admin", "pharmacist"), async (req, res): Promise<void> => {
  const parsed = CreateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.insert(suppliersTable).values(parsed.data).returning();
  res.status(201).json(formatSupplier(row));
});

router.patch("/suppliers/:id", requireRole("admin", "pharmacist"), async (req, res): Promise<void> => {
  const params = UpdateSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSupplierBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(suppliersTable)
    .set(parsed.data)
    .where(eq(suppliersTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json(formatSupplier(row));
});

router.delete("/suppliers/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteSupplierParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(suppliersTable).where(eq(suppliersTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({ message: "Supplier deleted" });
});

export default router;
