import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, inventoryLossTable, productsTable, usersTable } from "@workspace/db";
import { authenticate, requireRole } from "../lib/auth.js";
import { z } from "zod";

const router: IRouter = Router();

router.use(authenticate);

const InventoryLossInputSchema = z.object({
  type: z.enum(["return", "damaged", "lost"]),
  productId: z.number().int(),
  quantity: z.number().int().positive(),
  reason: z.string().optional(),
});

const ListInventoryLossSchema = z.object({
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

router.get("/inventory-loss", async (req, res): Promise<void> => {
  const query = ListInventoryLossSchema.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.type) conditions.push(eq(inventoryLossTable.type, params.type));
  if (params.from) conditions.push(gte(inventoryLossTable.createdAt, new Date(params.from)));
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(inventoryLossTable.createdAt, toDate));
  }

  const rows = await db
    .select({
      loss: inventoryLossTable,
      productName: productsTable.name,
      userName: usersTable.name,
    })
    .from(inventoryLossTable)
    .leftJoin(productsTable, eq(inventoryLossTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(inventoryLossTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(sql`${inventoryLossTable.createdAt} DESC`);

  res.json(rows.map(({ loss, productName, userName }) => ({
    id: loss.id,
    type: loss.type,
    productId: loss.productId,
    productName: productName ?? null,
    quantity: loss.quantity,
    reason: loss.reason ?? null,
    userId: loss.userId ?? null,
    userName: userName ?? null,
    createdAt: loss.createdAt.toISOString(),
  })));
});

router.post("/inventory-loss", requireRole("admin", "pharmacist"), async (req, res): Promise<void> => {
  const parsed = InventoryLossInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { type, productId, quantity, reason } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (product.quantity < quantity) {
    res.status(400).json({ error: `Insufficient stock for ${product.name}` });
    return;
  }

  const [loss] = await db.insert(inventoryLossTable).values({
    type,
    productId,
    quantity,
    reason,
    userId: req.user!.userId,
  }).returning();

  await db
    .update(productsTable)
    .set({ quantity: sql`${productsTable.quantity} - ${quantity}` })
    .where(eq(productsTable.id, productId));

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  res.status(201).json({
    id: loss.id,
    type: loss.type,
    productId: loss.productId,
    productName: product.name,
    quantity: loss.quantity,
    reason: loss.reason ?? null,
    userId: loss.userId ?? null,
    userName: userRow?.name ?? null,
    createdAt: loss.createdAt.toISOString(),
  });
});

export default router;
