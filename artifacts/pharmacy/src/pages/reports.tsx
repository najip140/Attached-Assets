import { useState } from "react";
import { BarChart2, Calendar, TrendingUp, DollarSign } from "lucide-react";
import { useGetDailyReport, useGetMonthlyReport, getGetDailyReportQueryKey, getGetMonthlyReportQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { format } from "date-fns";

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

export default function ReportsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);

  const { data: daily, isLoading: dailyLoading } = useGetDailyReport(
    { date: dailyDate },
    { query: { queryKey: getGetDailyReportQueryKey({ date: dailyDate }) } }
  );

  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyReport(
    { year: monthlyYear, month: monthlyMonth },
    { query: { queryKey: getGetMonthlyReportQueryKey({ year: monthlyYear, month: monthlyMonth }) } }
  );

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sales and profitability analysis</p>
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily" data-testid="tab-daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly" data-testid="tab-monthly">Monthly Report</TabsTrigger>
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
                <StatCard title="Revenue" value={`$${daily.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`$${daily.totalProfit.toFixed(2)}`} icon={TrendingUp} sub={daily.totalRevenue > 0 ? `${((daily.totalProfit / daily.totalRevenue) * 100).toFixed(1)}% margin` : undefined} />
                <StatCard title="Avg Sale" value={daily.totalTransactions > 0 ? `$${(daily.totalRevenue / daily.totalTransactions).toFixed(2)}` : "$0.00"} icon={DollarSign} />
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                {/* By category */}
                {daily.salesByCategory && daily.salesByCategory.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Revenue by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={daily.salesByCategory} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={70} label={({ category }) => category}>
                            {daily.salesByCategory?.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top products */}
                {daily.topProducts && daily.topProducts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Top Products</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-border">
                            <th className="text-left px-4 py-2 font-medium">Product</th>
                            <th className="text-right px-4 py-2 font-medium">Qty</th>
                            <th className="text-right px-4 py-2 font-medium">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {daily.topProducts.map((p) => (
                            <tr key={p.productId} className="border-b border-border last:border-0">
                              <td className="px-4 py-2 text-foreground">{p.productName}</td>
                              <td className="px-4 py-2 text-right text-muted-foreground">{p.quantity}</td>
                              <td className="px-4 py-2 text-right font-semibold">${p.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data for selected date</p>
          )}
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly" className="space-y-5 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Year:</Label>
              <Input type="number" value={monthlyYear} onChange={(e) => setMonthlyYear(parseInt(e.target.value))} className="w-24" data-testid="input-monthly-year" />
            </div>
            <div className="flex items-center gap-2">
              <Label>Month:</Label>
              <Input type="number" min="1" max="12" value={monthlyMonth} onChange={(e) => setMonthlyMonth(parseInt(e.target.value))} className="w-20" data-testid="input-monthly-month" />
            </div>
          </div>

          {monthlyLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : monthly ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title="Transactions" value={String(monthly.totalTransactions)} icon={BarChart2} />
                <StatCard title="Revenue" value={`$${monthly.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title="Profit" value={`$${monthly.totalProfit.toFixed(2)}`} icon={TrendingUp} sub={monthly.totalRevenue > 0 ? `${((monthly.totalProfit / monthly.totalRevenue) * 100).toFixed(1)}% margin` : undefined} />
              </div>

              {/* Daily bar chart */}
              {monthly.dailyBreakdown && monthly.dailyBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Daily Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthly.dailyBreakdown} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tickFormatter={(v) => { try { return format(new Date(v), "d"); } catch { return v; } }}
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Top products */}
              {monthly.topProducts && monthly.topProducts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Top Products — {format(new Date(monthlyYear, monthlyMonth - 1), "MMMM yyyy")}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border">
                          <th className="text-left px-4 py-2 font-medium">Product</th>
                          <th className="text-right px-4 py-2 font-medium">Quantity Sold</th>
                          <th className="text-right px-4 py-2 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthly.topProducts.map((p) => (
                          <tr key={p.productId} className="border-b border-border last:border-0 hover:bg-muted/30">
                            <td className="px-4 py-2.5 font-medium text-foreground">{p.productName}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{p.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-foreground">${p.revenue.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data for selected month</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
