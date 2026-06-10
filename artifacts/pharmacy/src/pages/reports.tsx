import { useState } from "react";
import { BarChart2, TrendingUp, DollarSign, Users, Package, ArrowDownCircle } from "lucide-react";
import {
  useGetDailyReport, useGetMonthlyReport,
  getGetDailyReportQueryKey, getGetMonthlyReportQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function StatCard({ title, value, icon: Icon, sub }: { title: string; value: string; icon: React.ElementType; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <Icon className="w-8 h-8 text-primary/30" />
        </div>
      </CardContent>
    </Card>
  );
}

function apiUrl(path: string) { return `/api${path}`; }

interface SalesReport {
  totalTransactions: number;
  totalRevenue: number;
  totalDiscount: number;
  totalProfit: number;
  salesByPaymentType: { paymentType: string; count: number; total: number }[];
  sales: { id: number; cashierName: string | null; totalAmount: number; discount: number; paymentType: string; createdAt: string }[];
}

interface InventoryReport {
  totalProducts: number;
  totalStockValue: number;
  totalRetailValue: number;
  lowStockCount: number;
  items: { productId: number; productName: string; category: string; quantity: number; reorderLevel: number; purchasePrice: number; sellingPrice: number; stockValue: number; retailValue: number }[];
}

interface UserPerformance {
  userId: number;
  userName: string;
  totalSales: number;
  totalRevenue: number;
  totalTransactions: number;
}

interface ProfitReport {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  byProduct: { productId: number; productName: string; quantitySold: number; revenue: number; cost: number; profit: number }[];
}

interface LossRecord {
  id: number;
  type: string;
  productName: string | null;
  quantity: number;
  reason: string | null;
  userName: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const { token } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);

  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");
  const [salesUser, setSalesUser] = useState("");
  const [salesPayment, setSalesPayment] = useState("all");

  const [profitFrom, setProfitFrom] = useState("");
  const [profitTo, setProfitTo] = useState("");

  const [userFrom, setUserFrom] = useState("");
  const [userTo, setUserTo] = useState("");

  const [lossType, setLossType] = useState("all");
  const [lossFrom, setLossFrom] = useState("");
  const [lossTo, setLossTo] = useState("");

  const { data: daily, isLoading: dailyLoading } = useGetDailyReport(
    { date: dailyDate },
    { query: { queryKey: getGetDailyReportQueryKey({ date: dailyDate }) } }
  );

  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyReport(
    { year: monthlyYear, month: monthlyMonth },
    { query: { queryKey: getGetMonthlyReportQueryKey({ year: monthlyYear, month: monthlyMonth }) } }
  );

  const salesParams = new URLSearchParams();
  if (salesFrom) salesParams.set("from", salesFrom);
  if (salesTo) salesParams.set("to", salesTo);
  if (salesUser) salesParams.set("userId", salesUser);
  if (salesPayment && salesPayment !== "all") salesParams.set("paymentType", salesPayment);

  const { data: salesReport, isLoading: salesLoading } = useQuery<SalesReport>({
    queryKey: ["report-sales", salesFrom, salesTo, salesUser, salesPayment],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/reports/sales?${salesParams}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: inventoryReport, isLoading: inventoryLoading } = useQuery<InventoryReport>({
    queryKey: ["report-inventory"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/reports/inventory"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const userParams = new URLSearchParams();
  if (userFrom) userParams.set("from", userFrom);
  if (userTo) userParams.set("to", userTo);

  const { data: userReport = [], isLoading: userLoading } = useQuery<UserPerformance[]>({
    queryKey: ["report-users", userFrom, userTo],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/reports/users?${userParams}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const profitParams = new URLSearchParams();
  if (profitFrom) profitParams.set("from", profitFrom);
  if (profitTo) profitParams.set("to", profitTo);

  const { data: profitReport, isLoading: profitLoading } = useQuery<ProfitReport>({
    queryKey: ["report-profit", profitFrom, profitTo],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/reports/profit?${profitParams}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const lossParams = new URLSearchParams();
  if (lossType && lossType !== "all") lossParams.set("type", lossType);
  if (lossFrom) lossParams.set("from", lossFrom);
  if (lossTo) lossParams.set("to", lossTo);

  const { data: lossRecords = [], isLoading: lossLoading } = useQuery<LossRecord[]>({
    queryKey: ["report-losses", lossType, lossFrom, lossTo],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/reports/losses?${lossParams}`), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sales, inventory and profitability analysis</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="users">User Performance</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="losses">Loss Reports</TabsTrigger>
        </TabsList>

        {/* Daily */}
        <TabsContent value="daily" className="space-y-5 mt-4">
          <div className="flex items-center gap-3">
            <Label>Date:</Label>
            <Input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} className="w-44" data-testid="input-daily-date" />
          </div>
          {dailyLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : daily ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Transactions" value={String(daily.totalTransactions)} icon={BarChart2} />
                <StatCard title="Revenue" value={`ETB ${daily.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`ETB ${daily.totalProfit.toFixed(2)}`} icon={TrendingUp} sub={daily.totalRevenue > 0 ? `${((daily.totalProfit / daily.totalRevenue) * 100).toFixed(1)}% margin` : undefined} />
                <StatCard title="Avg Sale" value={daily.totalTransactions > 0 ? `ETB ${(daily.totalRevenue / daily.totalTransactions).toFixed(2)}` : "ETB 0.00"} icon={DollarSign} />
              </div>
              <div className="grid lg:grid-cols-2 gap-5">
                {daily.salesByCategory && daily.salesByCategory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={daily.salesByCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category }) => category}>
                            {daily.salesByCategory?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `ETB ${v.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
                {daily.topProducts && daily.topProducts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Products</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2 font-medium">Product</th><th className="text-right px-4 py-2 font-medium">Qty</th><th className="text-right px-4 py-2 font-medium">Revenue</th></tr></thead>
                        <tbody>
                          {daily.topProducts.map((p) => (
                            <tr key={p.productId} className="border-b border-border last:border-0">
                              <td className="px-4 py-2">{p.productName}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{p.quantity}</td>
                              <td className="px-4 py-2 text-right font-semibold">ETB {p.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : <p className="text-muted-foreground text-center py-12">No data for selected date</p>}
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly" className="space-y-5 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2"><Label>Year:</Label><Input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(parseInt(e.target.value))} className="w-24" /></div>
            <div className="flex items-center gap-2"><Label>Month:</Label><Input type="number" min="1" max="12" value={monthlyMonth} onChange={(e) => setMonthlyMonth(parseInt(e.target.value))} className="w-20" /></div>
          </div>
          {monthlyLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : monthly ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Transactions" value={String(monthly.totalTransactions)} icon={BarChart2} />
                <StatCard title="Revenue" value={`ETB ${monthly.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`ETB ${monthly.totalProfit.toFixed(2)}`} icon={TrendingUp} />
              </div>
              {monthly.dailyBreakdown && monthly.dailyBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Daily Revenue — {format(new Date(monthlyYear, monthlyMonth - 1), "MMMM yyyy")}</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthly.dailyBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(v) => { try { return format(new Date(v), "d"); } catch { return v; } }} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`ETB ${v.toFixed(2)}`, "Revenue"]} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          ) : <p className="text-muted-foreground text-center py-12">No data</p>}
        </TabsContent>

        {/* Sales Report */}
        <TabsContent value="sales" className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2"><Label className="text-xs">From:</Label><Input type="date" className="w-38 h-8" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">To:</Label><Input type="date" className="w-38 h-8" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">Payment:</Label>
              <Select value={salesPayment} onValueChange={setSalesPayment}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {salesLoading ? <Skeleton className="h-64" /> : salesReport ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Transactions" value={String(salesReport.totalTransactions)} icon={BarChart2} />
                <StatCard title="Revenue" value={`ETB ${salesReport.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Discounts" value={`ETB ${salesReport.totalDiscount.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`ETB ${salesReport.totalProfit.toFixed(2)}`} icon={TrendingUp} />
              </div>
              {salesReport.salesByPaymentType.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By Payment Type</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">Type</th><th className="text-right px-4 py-2">Count</th><th className="text-right px-4 py-2">Total</th></tr></thead>
                      <tbody>
                        {salesReport.salesByPaymentType.map((r) => (
                          <tr key={r.paymentType} className="border-b border-border last:border-0">
                            <td className="px-4 py-2 capitalize"><Badge variant="outline">{r.paymentType}</Badge></td>
                            <td className="px-4 py-2 text-right">{r.count}</td>
                            <td className="px-4 py-2 text-right font-semibold">ETB {r.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Transactions ({salesReport.sales.length})</CardTitle></CardHeader>
                <CardContent className="p-0 max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card"><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Cashier</th><th className="text-left px-4 py-2">Payment</th><th className="text-right px-4 py-2">Total</th></tr></thead>
                    <tbody>
                      {salesReport.sales.map((s) => (
                        <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 text-xs">{format(new Date(s.createdAt), "MMM d, h:mm a")}</td>
                          <td className="px-4 py-2">{s.cashierName ?? "—"}</td>
                          <td className="px-4 py-2 capitalize"><Badge variant="outline" className="text-[10px]">{s.paymentType}</Badge></td>
                          <td className="px-4 py-2 text-right font-semibold">ETB {s.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Inventory Report */}
        <TabsContent value="inventory" className="space-y-5 mt-4">
          {inventoryLoading ? <Skeleton className="h-64" /> : inventoryReport ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Products" value={String(inventoryReport.totalProducts)} icon={Package} />
                <StatCard title="Stock Cost Value" value={`ETB ${inventoryReport.totalStockValue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Retail Value" value={`ETB ${inventoryReport.totalRetailValue.toFixed(2)}`} icon={TrendingUp} />
                <StatCard title="Low Stock" value={String(inventoryReport.lowStockCount)} icon={BarChart2} />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Inventory Valuation</CardTitle></CardHeader>
                <CardContent className="p-0 max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card"><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">Product</th><th className="text-left px-4 py-2">Category</th><th className="text-right px-4 py-2">Qty</th><th className="text-right px-4 py-2">Cost/Unit</th><th className="text-right px-4 py-2">Stock Value</th><th className="text-right px-4 py-2">Retail Value</th></tr></thead>
                    <tbody>
                      {inventoryReport.items.map((item) => (
                        <tr key={item.productId} className={`border-b border-border last:border-0 hover:bg-muted/30 ${item.quantity <= item.reorderLevel ? "bg-destructive/5" : ""}`}>
                          <td className="px-4 py-2 font-medium">{item.productName}</td>
                          <td className="px-4 py-2 text-muted-foreground">{item.category}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">ETB {item.purchasePrice.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">ETB {item.stockValue.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold">ETB {item.retailValue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* User Performance */}
        <TabsContent value="users" className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2"><Label className="text-xs">From:</Label><Input type="date" className="w-38 h-8" value={userFrom} onChange={(e) => setUserFrom(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">To:</Label><Input type="date" className="w-38 h-8" value={userTo} onChange={(e) => setUserTo(e.target.value)} /></div>
          </div>
          {userLoading ? <Skeleton className="h-64" /> : (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">User Performance</CardTitle></CardHeader>
              <CardContent className="p-0">
                {userReport.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No data</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">User</th><th className="text-right px-4 py-2">Transactions</th><th className="text-right px-4 py-2">Revenue</th></tr></thead>
                    <tbody>
                      {userReport.map((u) => (
                        <tr key={u.userId} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />{u.userName}</td>
                          <td className="px-4 py-2 text-right">{u.totalTransactions}</td>
                          <td className="px-4 py-2 text-right font-semibold">ETB {u.totalRevenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profit Report */}
        <TabsContent value="profit" className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2"><Label className="text-xs">From:</Label><Input type="date" className="w-38 h-8" value={profitFrom} onChange={(e) => setProfitFrom(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">To:</Label><Input type="date" className="w-38 h-8" value={profitTo} onChange={(e) => setProfitTo(e.target.value)} /></div>
          </div>
          {profitLoading ? <Skeleton className="h-64" /> : profitReport ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Revenue" value={`ETB ${profitReport.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Cost" value={`ETB ${profitReport.totalCost.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`ETB ${profitReport.totalProfit.toFixed(2)}`} icon={TrendingUp} />
                <StatCard title="Margin" value={`${profitReport.profitMargin.toFixed(1)}%`} icon={TrendingUp} />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Profit by Product</CardTitle></CardHeader>
                <CardContent className="p-0 max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-card"><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">Product</th><th className="text-right px-4 py-2">Sold</th><th className="text-right px-4 py-2">Revenue</th><th className="text-right px-4 py-2">Cost</th><th className="text-right px-4 py-2">Profit</th></tr></thead>
                    <tbody>
                      {profitReport.byProduct.map((p) => (
                        <tr key={p.productId} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium">{p.productName}</td>
                          <td className="px-4 py-2 text-right">{p.quantitySold}</td>
                          <td className="px-4 py-2 text-right">ETB {p.revenue.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">ETB {p.cost.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${p.profit >= 0 ? "text-chart-2" : "text-destructive"}`}>ETB {p.profit.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Loss Reports */}
        <TabsContent value="losses" className="space-y-5 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Type:</Label>
              <Select value={lossType} onValueChange={setLossType}>
                <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="return">Stock Returns</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Label className="text-xs">From:</Label><Input type="date" className="w-38 h-8" value={lossFrom} onChange={(e) => setLossFrom(e.target.value)} /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">To:</Label><Input type="date" className="w-38 h-8" value={lossTo} onChange={(e) => setLossTo(e.target.value)} /></div>
          </div>
          {lossLoading ? <Skeleton className="h-64" /> : (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Loss Records ({lossRecords.length})</CardTitle></CardHeader>
              <CardContent className="p-0">
                {lossRecords.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No loss records found</p> : (
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Type</th><th className="text-left px-4 py-2">Product</th><th className="text-right px-4 py-2">Qty</th><th className="text-left px-4 py-2">Reason</th><th className="text-left px-4 py-2">By</th></tr></thead>
                    <tbody>
                      {lossRecords.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2 text-xs">{format(new Date(r.createdAt), "MMM d, yyyy")}</td>
                          <td className="px-4 py-2"><Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge></td>
                          <td className="px-4 py-2 font-medium">{r.productName ?? "—"}</td>
                          <td className="px-4 py-2 text-right font-bold">{r.quantity}</td>
                          <td className="px-4 py-2 text-muted-foreground text-xs">{r.reason ?? "—"}</td>
                          <td className="px-4 py-2 text-xs">{r.userName ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
