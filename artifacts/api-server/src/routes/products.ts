import { Router, type IRouter } from "express";
import { eq, and, lte, or, sql, ilike } from "drizzle-orm";
import { db, productsTable, suppliersTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductParams,
  DeleteProductParams,
  GetProductParams,
  GetExpiringProductsQueryParams,
} from "@workspace/api-zod";
import { authenticate, requireRole } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

async function formatProduct(p: typeof productsTable.$inferSelect & { supplierName?: string | null }) {
  return {
    id: p.id,
    name: p.name,
    genericName: p.genericName,
    category: p.category,
    barcode: p.barcode,
    batchNumber: p.batchNumber,
    supplierId: p.supplierId,
    supplierName: p.supplierName ?? null,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
    quantity: p.quantity,
    reorderLevel: p.reorderLevel,
    expiryDate: p.expiryDate ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/products/expiry", async (req, res): Promise<void> => {
  const query = GetExpiringProductsQueryParams.safeParse(req.query);
  const days = query.success ? (query.data.days ?? 30) : 30;

  const today = new Date();
  const future = new Date(today);
  future.setDate(future.getDate() + days);
  const todayStr = today.toISOString().split("T")[0];
  const futureStr = future.toISOString().split("T")[0];

  const expired = await db
    .select()
    .from(productsTable)
    .where(and(sql`${productsTable.expiryDate} IS NOT NULL`, sql`${productsTable.expiryDate} < ${todayStr}`));

  const expiringSoon = await db
    .select()
    .from(productsTable)
    .where(
      and(
        sql`${productsTable.expiryDate} IS NOT NULL`,
        sql`${productsTable.expiryDate} >= ${todayStr}`,
        sql`${productsTable.expiryDate} <= ${futureStr}`
      )
    );

  res.json({
    expired: await Promise.all(expired.map(formatProduct)),
    expiringSoon: await Promise.all(expiringSoon.map(formatProduct)),
  });
});

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];

  if (params.search) {
    const s = `%${params.search}%`;
    conditions.push(
      or(ilike(productsTable.name, s), ilike(productsTable.genericName, s), ilike(productsTable.barcode ?? "", s))
    );
  }

  if (params.category) {
    conditions.push(eq(productsTable.category, params.category));
  }

  if (params.lowStock) {
    conditions.push(sql`${productsTable.quantity} <= ${productsTable.reorderLevel}`);
  }

  const rows = await db
    .select({
      product: productsTable,
      supplierName: suppliersTable.name,
    })
    .from(productsTable)
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(productsTable.name);

  const products = await Promise.all(
    rows.map(({ product, supplierName }) => formatProduct({ ...product, supplierName }))
  );

  res.json(products);
});

router.post("/products", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db.insert(productsTable).values({
    ...parsed.data,
    purchasePrice: String(parsed.data.purchasePrice),
    sellingPrice: String(parsed.data.sellingPrice),
  }).returning();
  res.status(201).json(await formatProduct(row));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select({ product: productsTable, supplierName: suppliersTable.name })
    .from(productsTable)
    .leftJoin(suppliersTable, eq(productsTable.supplierId, suppliersTable.id))
    .where(eq(productsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(await formatProduct({ ...row.product, supplierName: row.supplierName }));
});

router.patch("/products/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { purchasePrice: pp, sellingPrice: sp, ...rest } = parsed.data;
  const updateData = {
    ...rest,
    ...(pp !== undefined && { purchasePrice: String(pp) }),
    ...(sp !== undefined && { sellingPrice: String(sp) }),
  };
  const [row] = await db
    .update(productsTable)
    .set(updateData)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(await formatProduct(row));
});

router.delete("/products/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json({ message: "Product deleted" });
});

export default router;
