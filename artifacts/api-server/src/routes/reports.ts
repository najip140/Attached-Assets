import { Router, type IRouter } from "express";
import { gte, lte, and, sql, eq } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable } from "@workspace/db";
import { GetDailyReportQueryParams, GetMonthlyReportQueryParams } from "@workspace/api-zod";
import { authenticate } from "../lib/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/reports/daily", async (req, res): Promise<void> => {
  const query = GetDailyReportQueryParams.safeParse(req.query);
  const dateStr = (query.success && query.data.date) ? query.data.date : new Date().toISOString().split("T")[0];

  const start = new Date(`${dateStr}T00:00:00Z`);
  const end = new Date(`${dateStr}T23:59:59Z`);

  const [totals] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      totalTransactions: sql<string>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const profitRows = await db
    .select({
      profit: sql<string>`COALESCE(SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const categoryRows = await db
    .select({
      category: productsTable.category,
      revenue: sql<string>`COALESCE(SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(productsTable.category);

  const topProductRows = await db
    .select({
      productId: productsTable.id,
      productName: productsTable.name,
      quantity: sql<string>`SUM(${saleItemsTable.quantity})`,
      revenue: sql<string>`SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(sql`SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity}) DESC`)
    .limit(10);

  res.json({
    date: dateStr,
    totalSales: Number(totals?.totalTransactions ?? 0),
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    totalProfit: Number(profitRows[0]?.profit ?? 0),
    totalTransactions: Number(totals?.totalTransactions ?? 0),
    salesByCategory: categoryRows.map((r) => ({
      category: r.category ?? "Unknown",
      revenue: Number(r.revenue),
      count: Number(r.count),
    })),
    topProducts: topProductRows.map((r) => ({
      productId: r.productId ?? 0,
      productName: r.productName ?? "Unknown",
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    })),
  });
});

router.get("/reports/monthly", async (req, res): Promise<void> => {
  const query = GetMonthlyReportQueryParams.safeParse(req.query);
  const now = new Date();
  const year = (query.success && query.data.year) ? Number(query.data.year) : now.getFullYear();
  const month = (query.success && query.data.month) ? Number(query.data.month) : now.getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const [totals] = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      totalTransactions: sql<string>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const profitRows = await db
    .select({
      profit: sql<string>`COALESCE(SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  const dailyRows = await db
    .select({
      date: sql<string>`DATE(${salesTable.createdAt})`,
      revenue: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      transactions: sql<string>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(sql`DATE(${salesTable.createdAt})`)
    .orderBy(sql`DATE(${salesTable.createdAt})`);

  const topProductRows = await db
    .select({
      productId: productsTable.id,
      productName: productsTable.name,
      quantity: sql<string>`SUM(${saleItemsTable.quantity})`,
      revenue: sql<string>`SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(sql`SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity}) DESC`)
    .limit(10);

  res.json({
    year,
    month,
    totalRevenue: Number(totals?.totalRevenue ?? 0),
    totalProfit: Number(profitRows[0]?.profit ?? 0),
    totalTransactions: Number(totals?.totalTransactions ?? 0),
    dailyBreakdown: dailyRows.map((r) => ({
      date: r.date,
      revenue: Number(r.revenue),
      transactions: Number(r.transactions),
    })),
    topProducts: topProductRows.map((r) => ({
      productId: r.productId ?? 0,
      productName: r.productName ?? "Unknown",
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    })),
  });
});

export default router;
