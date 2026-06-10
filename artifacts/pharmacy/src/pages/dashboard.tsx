import { TrendingUp, Package, AlertTriangle, Calendar, DollarSign, ShoppingBag, ArrowRight, Database, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO, formatDistanceToNow } from "date-fns";

function StatCard({ title, value, icon: Icon, color, badge, ...rest }: {
  title: string; value: string | number; icon: React.ElementType; color: string; badge?: string;
  [key: string]: unknown;
}) {
  return (
    <Card>
      <CardContent className="p-5" {...rest}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {badge && (
              <Badge variant="outline" className="mt-2 text-xs">{badge}</Badge>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DbStatusCard() {
  const { user } = useAuth();
  const token = localStorage.getItem("pharmacy_token");

  const { data } = useQuery<{ connected: boolean; lastBackupAt: string | null; totalBackups: number }>({
    queryKey: ["db-status"],
    queryFn: async () => {
      const res = await fetch("/api/backups/db-status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 60_000,
    enabled: user?.role === "admin",
  });

  if (user?.role !== "admin") return null;

  const daysSince = data?.lastBackupAt
    ? Math.floor((Date.now() - new Date(data.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const health = daysSince === null ? "none" : daysSince === 0 ? "good" : daysSince <= 1 ? "ok" : "stale";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${data?.connected !== false ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Database</p>
            <p className="text-sm font-semibold mt-0.5">{data === undefined ? "Checking…" : data.connected ? "Connected" : "Disconnected"}</p>
            {data?.connected && <div className="flex items-center gap-1 mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-green-600">PostgreSQL</span></div>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <div className="p-2.5 rounded-lg shrink-0 bg-primary/10 text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last Backup</p>
            <p className="text-sm font-semibold mt-0.5">{data?.lastBackupAt ? format(new Date(data.lastBackupAt), "MMM d, yyyy") : "Never"}</p>
            {data?.lastBackupAt && <p className="text-[10px] text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(data.lastBackupAt), { addSuffix: true })}</p>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg shrink-0 ${health === "good" ? "bg-green-500/10 text-green-600" : health === "ok" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Backup Health</p>
            <p className="text-sm font-semibold mt-0.5">
              {health === "none" ? "No backups" : health === "good" ? "Up to date" : health === "ok" ? "Yesterday" : `${daysSince}d old`}
            </p>
            <Link href="/backup"><span className="text-[10px] text-primary hover:underline">{data?.totalBackups ?? 0} backup{(data?.totalBackups ?? 0) !== 1 ? "s" : ""} stored</span></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useGetDashboardSummary();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Overview of today's pharmacy operations</p>
      </div>

      {/* DB status row — admin only */}
      <DbStatusCard />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Sales Today"
          value={`ETB ${data?.totalSalesToday?.toFixed(2) ?? "0.00"}`}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          data-testid="stat-sales-today"
        />
        <StatCard
          title="Month Revenue"
          value={`ETB ${data?.totalSalesThisMonth?.toFixed(2) ?? "0.00"}`}
          icon={TrendingUp}
          color="bg-chart-2/10 text-chart-2"
        />
        <StatCard
          title="Total Products"
          value={data?.totalProducts ?? 0}
          icon={Package}
          color="bg-chart-3/10 text-chart-3"
        />
        <StatCard
          title="Low Stock"
          value={data?.lowStockCount ?? 0}
          icon={AlertTriangle}
          color="bg-destructive/10 text-destructive"
          badge={data?.lowStockCount ? "Needs attention" : undefined}
        />
        <StatCard
          title="Expiring Soon"
          value={data?.expiringCount ?? 0}
          icon={Calendar}
          color="bg-chart-5/10 text-chart-5"
          badge={data?.expiringCount ? "Within 30 days" : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sales chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">7-Day Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.salesChartData && data.salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.salesChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => {
                      try { return format(parseISO(v), "MMM d"); } catch { return v; }
                    }}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => { try { return format(parseISO(v), "MMM d, yyyy"); } catch { return v; } }}
                    formatter={(v: number) => [`ETB ${v.toFixed(2)}`, "Revenue"]}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No sales data</div>
            )}
          </CardContent>
        </Card>

        {/* Low stock alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Low Stock Alerts</CardTitle>
              <Link href="/products?lowStock=true">
                <span className="text-xs text-primary hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.lowStockProducts && data.lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {data.lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0" data-testid={`row-low-stock-${p.id}`}>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">{p.quantity} left</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">All products adequately stocked</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent sales */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
            <Link href="/pos">
              <span className="text-xs text-primary hover:underline flex items-center gap-1">
                New sale <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data?.recentSales && data.recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left pb-2 font-medium">Sale #</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                    <th className="text-right pb-2 font-medium">Discount</th>
                    <th className="text-right pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0" data-testid={`row-sale-${s.id}`}>
                      <td className="py-2.5 font-mono text-xs text-muted-foreground">#{String(s.id).padStart(4, "0")}</td>
                      <td className="py-2.5 text-right font-semibold text-foreground">ETB {s.totalAmount.toFixed(2)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{s.discount > 0 ? `ETB ${s.discount.toFixed(2)}` : "—"}</td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground">
                        {format(new Date(s.createdAt), "MMM d, h:mm a")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-muted-foreground">
              <ShoppingBag className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No sales today yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
