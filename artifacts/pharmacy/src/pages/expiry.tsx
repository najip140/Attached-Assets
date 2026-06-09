import { useState } from "react";
import { AlertTriangle, Calendar } from "lucide-react";
import { useGetExpiringProducts, getGetExpiringProductsQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { differenceInDays, parseISO } from "date-fns";

const DAY_OPTIONS = [30, 60, 90];

export default function ExpiryPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useGetExpiringProducts(
    { days },
    { query: { queryKey: getGetExpiringProductsQueryKey({ days }) } }
  );

  const expired = data?.expired ?? [];
  const expiringSoon = data?.expiringSoon ?? [];

  function ExpiryBadge({ date }: { date: string }) {
    const d = differenceInDays(parseISO(date), new Date());
    if (d < 0) return <Badge variant="destructive" className="text-xs">Expired {Math.abs(d)}d ago</Badge>;
    if (d <= 14) return <Badge className="text-xs bg-red-500/10 text-red-500 border-red-500/20 border">{d}d left</Badge>;
    return <Badge className="text-xs bg-chart-5/10 text-chart-5 border-chart-5/20 border">{d}d left</Badge>;
  }

  function ProductTable({ products, label }: { products: typeof expired; label: string }) {
    if (!products.length) return <p className="text-sm text-muted-foreground text-center py-6">No {label.toLowerCase()} products</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left px-4 py-3 font-medium">Product</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-right px-4 py-3 font-medium">Quantity</th>
              <th className="text-left px-4 py-3 font-medium">Batch #</th>
              <th className="text-right px-4 py-3 font-medium">Expiry Date</th>
              <th className="text-right px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30" data-testid={`row-expiry-${p.id}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.genericName}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <Badge variant="outline" className="text-xs">{p.category}</Badge>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{p.quantity}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.batchNumber ?? "—"}</td>
                <td className="px-4 py-3 text-right text-xs">{p.expiryDate ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {p.expiryDate && <ExpiryBadge date={p.expiryDate} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Expiry Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Monitor expired and expiring products</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Show expiring within:</span>
          {DAY_OPTIONS.map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)} data-testid={`button-days-${d}`}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <>
          {/* Expired */}
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" /> Expired Products ({expired.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable products={expired} label="Expired" />
            </CardContent>
          </Card>

          {/* Expiring soon */}
          <Card className="border-chart-5/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-chart-5">
                <Calendar className="w-4 h-4" /> Expiring Within {days} Days ({expiringSoon.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable products={expiringSoon} label="Expiring" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
