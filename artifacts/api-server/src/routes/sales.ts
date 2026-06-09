import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable, usersTable } from "@workspace/db";
import { CreateSaleBody, ListSalesQueryParams, GetSaleParams } from "@workspace/api-zod";
import { authenticate } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

async function getSaleWithItems(saleId: number) {
  const [sale] = await db
    .select({ sale: salesTable, cashierName: usersTable.name })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.userId, usersTable.id))
    .where(eq(salesTable.id, saleId));

  if (!sale) return null;

  const items = await db
    .select({ item: saleItemsTable, productName: productsTable.name })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, saleId));

  return {
    id: sale.sale.id,
    userId: sale.sale.userId,
    cashierName: sale.cashierName ?? null,
    totalAmount: Number(sale.sale.totalAmount),
    discount: Number(sale.sale.discount),
    amountPaid: Number(sale.sale.amountPaid),
    change: Number(sale.sale.change),
    createdAt: sale.sale.createdAt.toISOString(),
    items: items.map(({ item, productName }) => ({
      id: item.id,
      saleId: item.saleId,
      productId: item.productId,
      productName: productName ?? null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
  };
}

router.get("/sales", async (req, res): Promise<void> => {
  const query = ListSalesQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.from) {
    conditions.push(gte(salesTable.createdAt, new Date(params.from)));
  }
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, toDate));
  }

  const limit = params.limit ?? 50;

  const rows = await db
    .select({ sale: salesTable, cashierName: usersTable.name })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined)
    .orderBy(sql`${salesTable.createdAt} DESC`)
    .limit(limit);

  const result = rows.map(({ sale, cashierName }) => ({
    id: sale.id,
    userId: sale.userId,
    cashierName: cashierName ?? null,
    totalAmount: Number(sale.totalAmount),
    discount: Number(sale.discount),
    amountPaid: Number(sale.amountPaid),
    change: Number(sale.change),
    createdAt: sale.createdAt.toISOString(),
    items: [],
  }));

  res.json(result);
});

router.post("/sales", async (req, res): Promise<void> => {
  const parsed = CreateSaleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { items, totalAmount, discount, amountPaid, change } = parsed.data;

  for (const item of items) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    if (product.quantity < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      return;
    }
  }

  const [sale] = await db
    .insert(salesTable)
    .values({
      userId: req.user!.userId,
      totalAmount: totalAmount.toString(),
      discount: discount.toString(),
      amountPaid: amountPaid.toString(),
      change: change.toString(),
    })
    .returning();

  for (const item of items) {
    await db.insert(saleItemsTable).values({
      saleId: sale.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toString(),
      subtotal: (item.quantity * item.unitPrice).toString(),
    });

    await db
      .update(productsTable)
      .set({ quantity: sql`${productsTable.quantity} - ${item.quantity}` })
      .where(eq(productsTable.id, item.productId));
  }

  const result = await getSaleWithItems(sale.id);
  res.status(201).json(result);
});

router.get("/sales/:id", async (req, res): Promise<void> => {
  const params = GetSaleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getSaleWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  res.json(result);
});

export default router;
