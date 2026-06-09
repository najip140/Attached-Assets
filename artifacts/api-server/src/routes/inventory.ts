import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, stockMovementsTable, productsTable, usersTable } from "@workspace/db";
import { CreateStockMovementBody, ListStockMovementsQueryParams } from "@workspace/api-zod";
import { authenticate } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/stock-movements", async (req, res): Promise<void> => {
  const query = ListStockMovementsQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.productId) {
    conditions.push(eq(stockMovementsTable.productId, params.productId));
  }
  if (params.type) {
    conditions.push(eq(stockMovementsTable.type, params.type));
  }

  const rows = await db
    .select({
      movement: stockMovementsTable,
      productName: productsTable.name,
      userName: usersTable.name,
    })
    .from(stockMovementsTable)
    .leftJoin(productsTable, eq(stockMovementsTable.productId, productsTable.id))
    .leftJoin(usersTable, eq(stockMovementsTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(sql`${stockMovementsTable.createdAt} DESC`)
    .limit(100);

  res.json(
    rows.map(({ movement, productName, userName }) => ({
      id: movement.id,
      productId: movement.productId,
      productName: productName ?? null,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason,
      userId: movement.userId,
      userName: userName ?? null,
      createdAt: movement.createdAt.toISOString(),
    }))
  );
});

router.post("/stock-movements", async (req, res): Promise<void> => {
  const parsed = CreateStockMovementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, type, quantity, reason } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [movement] = await db
    .insert(stockMovementsTable)
    .values({
      productId,
      type,
      quantity,
      reason,
      userId: req.user!.userId,
    })
    .returning();

  if (type === "in") {
    await db
      .update(productsTable)
      .set({ quantity: sql`${productsTable.quantity} + ${quantity}` })
      .where(eq(productsTable.id, productId));
  } else if (type === "out") {
    await db
      .update(productsTable)
      .set({ quantity: sql`${productsTable.quantity} - ${quantity}` })
      .where(eq(productsTable.id, productId));
  }

  res.status(201).json({
    id: movement.id,
    productId: movement.productId,
    productName: product.name,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason,
    userId: movement.userId,
    userName: null,
    createdAt: movement.createdAt.toISOString(),
  });
});

export default router;
