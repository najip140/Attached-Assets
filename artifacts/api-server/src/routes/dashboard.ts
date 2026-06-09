import { Router, type IRouter } from "express";
import { gte, sql, eq } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import { authenticate } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [todaySalesResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(gte(salesTable.createdAt, startOfDay));

  const [monthSalesResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)` })
    .from(salesTable)
    .where(gte(salesTable.createdAt, startOfMonth));

  const [productCountResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(productsTable);

  const [lowStockResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(productsTable)
    .where(sql`${productsTable.quantity} <= ${productsTable.reorderLevel}`);

  const todayStr = today.toISOString().split("T")[0];
  const futureStr = new Date(today.getTime() + 30 * 86400000).toISOString().split("T")[0];
  const [expiringResult] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(productsTable)
    .where(
      sql`${productsTable.expiryDate} IS NOT NULL AND ${productsTable.expiryDate} >= ${todayStr} AND ${productsTable.expiryDate} <= ${futureStr}`
    );

  const recentSalesRows = await db
    .select()
    .from(salesTable)
    .orderBy(sql`${salesTable.createdAt} DESC`)
    .limit(10);

  const recentSales = recentSalesRows.map((s) => ({
    id: s.id,
    userId: s.userId,
    cashierName: null,
    totalAmount: Number(s.totalAmount),
    discount: Number(s.discount),
    amountPaid: Number(s.amountPaid),
    change: Number(s.change),
    createdAt: s.createdAt.toISOString(),
    items: [],
  }));

  const lowStockProducts = await db
    .select()
    .from(productsTable)
    .where(sql`${productsTable.quantity} <= ${productsTable.reorderLevel}`)
    .orderBy(productsTable.quantity)
    .limit(5);

  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const chartRaw = await db
    .select({
      date: sql<string>`DATE(${salesTable.createdAt})`,
      total: sql<string>`SUM(${salesTable.totalAmount})`,
    })
    .from(salesTable)
    .where(gte(salesTable.createdAt, sevenDaysAgo))
    .groupBy(sql`DATE(${salesTable.createdAt})`)
    .orderBy(sql`DATE(${salesTable.createdAt})`);

  const [profitResult] = await db
    .select({
      profit: sql<string>`COALESCE(SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(gte(salesTable.createdAt, startOfMonth));

  res.json({
    totalSalesToday: Number(todaySalesResult?.total ?? 0),
    totalSalesThisMonth: Number(monthSalesResult?.total ?? 0),
    totalProducts: Number(productCountResult?.count ?? 0),
    lowStockCount: Number(lowStockResult?.count ?? 0),
    expiringCount: Number(expiringResult?.count ?? 0),
    totalProfit: Number(profitResult?.profit ?? 0),
    recentSales,
    lowStockProducts: lowStockProducts.map((p) => ({
      id: p.id,
      name: p.name,
      genericName: p.genericName,
      category: p.category,
      barcode: p.barcode,
      batchNumber: p.batchNumber,
      supplierId: p.supplierId,
      supplierName: null,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      expiryDate: p.expiryDate ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    salesChartData: chartRaw.map((r) => ({ date: r.date, total: Number(r.total) })),
  });
});

export default router;
