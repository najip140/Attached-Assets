import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db, endOfDayTable, salesTable, saleItemsTable, productsTable, usersTable } from "@workspace/db";
import { authenticate, requireRole } from "../lib/auth.js";
import { z } from "zod";

const router: IRouter = Router();

router.use(authenticate);

const CloseDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

async function getDaySummary(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);

  const salesRows = await db
    .select({
      paymentType: salesTable.paymentType,
      total: sql<string>`COALESCE(SUM(${salesTable.totalAmount}), 0)`,
      count: sql<string>`COUNT(*)`,
    })
    .from(salesTable)
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)))
    .groupBy(salesTable.paymentType);

  const profitRows = await db
    .select({
      profit: sql<string>`COALESCE(SUM((${saleItemsTable.unitPrice} - ${productsTable.purchasePrice}) * ${saleItemsTable.quantity}), 0)`,
    })
    .from(saleItemsTable)
    .innerJoin(salesTable, eq(saleItemsTable.saleId, salesTable.id))
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(and(gte(salesTable.createdAt, start), lte(salesTable.createdAt, end)));

  let totalCash = 0, totalWallet = 0, totalBank = 0, totalTransactions = 0;
  for (const row of salesRows) {
    const amount = Number(row.total);
    const cnt = Number(row.count);
    totalTransactions += cnt;
    if (row.paymentType === "cash") totalCash = amount;
    else if (row.paymentType === "wallet") totalWallet = amount;
    else if (row.paymentType === "bank") totalBank = amount;
  }

  return {
    totalCashSales: totalCash,
    totalWalletSales: totalWallet,
    totalBankSales: totalBank,
    totalRevenue: totalCash + totalWallet + totalBank,
    totalProfit: Number(profitRows[0]?.profit ?? 0),
    totalTransactions,
  };
}

router.get("/end-of-day", async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) ?? "30", 10);

  const rows = await db
    .select({ eod: endOfDayTable, closedByName: usersTable.name })
    .from(endOfDayTable)
    .leftJoin(usersTable, eq(endOfDayTable.closedBy, usersTable.id))
    .orderBy(desc(endOfDayTable.closedAt))
    .limit(limit);

  res.json(rows.map(({ eod, closedByName }) => ({
    id: eod.id,
    date: eod.date,
    totalCashSales: Number(eod.totalCashSales),
    totalWalletSales: Number(eod.totalWalletSales),
    totalBankSales: Number(eod.totalBankSales),
    totalRevenue: Number(eod.totalRevenue),
    totalProfit: Number(eod.totalProfit),
    totalTransactions: eod.totalTransactions,
    notes: eod.notes ?? null,
    closedBy: eod.closedBy ?? null,
    closedByName: closedByName ?? null,
    closedAt: eod.closedAt.toISOString(),
    createdAt: eod.createdAt.toISOString(),
  })));
});

router.get("/end-of-day/preview", async (req, res): Promise<void> => {
  const dateStr = (req.query.date as string) ?? new Date().toISOString().split("T")[0];

  const summary = await getDaySummary(dateStr);

  const [existing] = await db
    .select()
    .from(endOfDayTable)
    .where(eq(endOfDayTable.date, dateStr));

  res.json({
    date: dateStr,
    ...summary,
    alreadyClosed: !!existing,
  });
});

router.post("/end-of-day", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CloseDaySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { date, notes } = parsed.data;

  const [existing] = await db.select().from(endOfDayTable).where(eq(endOfDayTable.date, date));
  if (existing) {
    res.status(409).json({ error: `Day ${date} has already been closed` });
    return;
  }

  const summary = await getDaySummary(date);

  const [eod] = await db.insert(endOfDayTable).values({
    date,
    totalCashSales: summary.totalCashSales.toString(),
    totalWalletSales: summary.totalWalletSales.toString(),
    totalBankSales: summary.totalBankSales.toString(),
    totalRevenue: summary.totalRevenue.toString(),
    totalProfit: summary.totalProfit.toString(),
    totalTransactions: summary.totalTransactions,
    notes,
    closedBy: req.user!.userId,
    closedAt: new Date(),
  }).returning();

  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  res.status(201).json({
    id: eod.id,
    date: eod.date,
    totalCashSales: Number(eod.totalCashSales),
    totalWalletSales: Number(eod.totalWalletSales),
    totalBankSales: Number(eod.totalBankSales),
    totalRevenue: Number(eod.totalRevenue),
    totalProfit: Number(eod.totalProfit),
    totalTransactions: eod.totalTransactions,
    notes: eod.notes ?? null,
    closedBy: eod.closedBy ?? null,
    closedByName: userRow?.name ?? null,
    closedAt: eod.closedAt.toISOString(),
    createdAt: eod.createdAt.toISOString(),
  });
});

export default router;
