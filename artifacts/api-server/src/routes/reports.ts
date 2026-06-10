import { Router, type IRouter } from "express";
import { gte, lte, and, sql, eq, desc } from "drizzle-orm";
import { db, salesTable, saleItemsTable, productsTable, usersTable, inventoryLossTable } from "@workspace/db";
import { GetDailyReportQueryParams, GetMonthlyReportQueryParams } from "@workspace/api-zod";
import { authenticate, requireRole } from "../lib/auth.js";
import { z } from "zod";

const router: IRouter = Router();

router.use(authenticate);

const DateRangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  userId: z.coerce.number().int().optional(),
  paymentType: z.string().optional(),
  productId: z.coerce.number().int().optional(),
});

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

router.get("/reports/sales", requireRole("admin"), async (req, res): Promise<void> => {
  const query = DateRangeSchema.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.from) conditions.push(gte(salesTable.createdAt, new Date(params.from)));
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, toDate));
  }
  if (params.userId) conditions.push(eq(salesTable.userId, params.userId));
  if (params.paymentType) conditions.push(eq(salesTable.paymentType, params.paymentType));

  const salesRows = await db
    .select({ sale: salesTable, cashierName: usersTable.name })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined)
    .orderBy(desc(salesTable.createdAt))
    .limit(500);

  const paymentTypeRows = await db
    .select({
      paymentType: salesTable.paymentType,
      count: sql<string>`COUNT(*)`,
      total: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
    })
    .from(salesTable)
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined)
    .groupBy(salesTable.paymentType);

  const profitRows = await db
    .select({
      profit: sql<string>`COALESCE(SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity}), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined);

  const totalRevenue = salesRows.reduce((s, r) => s + Number(r.sale.totalAmount), 0);
  const totalDiscount = salesRows.reduce((s, r) => s + Number(r.sale.discount), 0);

  res.json({
    totalTransactions: salesRows.length,
    totalRevenue,
    totalDiscount,
    totalProfit: Number(profitRows[0]?.profit ?? 0),
    salesByPaymentType: paymentTypeRows.map((r) => ({
      paymentType: r.paymentType,
      count: Number(r.count),
      total: Number(r.total),
    })),
    sales: salesRows.map(({ sale, cashierName }) => ({
      id: sale.id,
      userId: sale.userId,
      cashierName: cashierName ?? null,
      totalAmount: Number(sale.totalAmount),
      discount: Number(sale.discount),
      amountPaid: Number(sale.amountPaid),
      change: Number(sale.change),
      paymentType: sale.paymentType,
      createdAt: sale.createdAt.toISOString(),
      items: [],
    })),
  });
});

router.get("/reports/inventory", requireRole("admin"), async (req, res): Promise<void> => {
  const rows = await db.select().from(productsTable).orderBy(productsTable.name);

  let totalStockValue = 0, totalRetailValue = 0, lowStockCount = 0;
  const items = rows.map((p) => {
    const stockValue = Number(p.purchasePrice) * p.quantity;
    const retailValue = Number(p.sellingPrice) * p.quantity;
    totalStockValue += stockValue;
    totalRetailValue += retailValue;
    if (p.quantity <= p.reorderLevel) lowStockCount++;
    return {
      productId: p.id,
      productName: p.name,
      category: p.category,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      purchasePrice: Number(p.purchasePrice),
      sellingPrice: Number(p.sellingPrice),
      stockValue,
      retailValue,
    };
  });

  res.json({ totalProducts: rows.length, totalStockValue, totalRetailValue, lowStockCount, items });
});

router.get("/reports/users", requireRole("admin"), async (req, res): Promise<void> => {
  const query = DateRangeSchema.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.from) conditions.push(gte(salesTable.createdAt, new Date(params.from)));
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, toDate));
  }

  const rows = await db
    .select({
      userId: salesTable.userId,
      userName: usersTable.name,
      totalRevenue: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      totalTransactions: sql<string>`COUNT(*)`,
    })
    .from(salesTable)
    .leftJoin(usersTable, eq(salesTable.userId, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined)
    .groupBy(salesTable.userId, usersTable.name)
    .orderBy(sql`SUM(${salesTable.totalAmount}) DESC`);

  res.json(rows.map((r) => ({
    userId: r.userId ?? 0,
    userName: r.userName ?? "Unknown",
    totalSales: Number(r.totalRevenue),
    totalRevenue: Number(r.totalRevenue),
    totalTransactions: Number(r.totalTransactions),
  })));
});

router.get("/reports/profit", requireRole("admin"), async (req, res): Promise<void> => {
  const query = DateRangeSchema.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.from) conditions.push(gte(salesTable.createdAt, new Date(params.from)));
  if (params.to) {
    const toDate = new Date(params.to);
    toDate.setHours(23, 59, 59, 999);
    conditions.push(lte(salesTable.createdAt, toDate));
  }

  const rows = await db
    .select({
      productId: productsTable.id,
      productName: productsTable.name,
      quantitySold: sql<string>`SUM(${saleItemsTable.quantity})`,
      revenue: sql<string>`SUM(${saleItemsTable.unitPrice} * ${saleItemsTable.quantity})`,
      cost: sql<string>`SUM(${productsTable.purchasePrice} * ${saleItemsTable.quantity})`,
      profit: sql<string>`SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity})`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof gte>])) : undefined)
    .groupBy(productsTable.id, productsTable.name)
    .orderBy(sql`SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}) DESC`);

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.cost), 0);
  const totalProfit = totalRevenue - totalCost;

  res.json({
    totalRevenue,
    totalCost,
    totalProfit,
    profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    byProduct: rows.map((r) => ({
      productId: r.productId ?? 0,
      productName: r.productName ?? "Unknown",
      quantitySold: Number(r.quantitySold),
      revenue: Number(r.revenue),
      cost: Number(r.cost),
      profit: Number(r.profit),
    })),
  });
});

router.get("/reports/losses", requireRole("admin"), async (req, res): Promise<void> => {
  const query = DateRangeSchema.safeParse(req.query);
  const params = query.success ? query.data : {};
  const type = req.query.type as string | undefined;

  const conditions = [];
  if (type) conditions.push(eq(inventoryLossTable.type, type));
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

export default router;
