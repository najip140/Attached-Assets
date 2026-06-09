import { useState } from "react";
import { Plus, TrendingUp, TrendingDown, SlidersHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStockMovements, useCreateStockMovement, useListProducts,
  getListStockMovementsQueryKey, getListProductsQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  in: { color: "bg-chart-3/10 text-chart-3 border-chart-3/20", label: "Stock In" },
  out: { color: "bg-destructive/10 text-destructive border-destructive/20", label: "Stock Out" },
  adjustment: { color: "bg-chart-2/10 text-chart-2 border-chart-2/20", label: "Adjustment" },
};

export default function InventoryPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", type: "in", quantity: "", reason: "" });
  const [productFilter, setProductFilter] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: movements, isLoading } = useListStockMovements(
    { productId: productFilter ? parseInt(productFilter) : undefined },
    { query: { queryKey: getListStockMovementsQueryKey({ productId: productFilter ? parseInt(productFilter) : undefined }) } }
  );
  const { data: products } = useListProducts();

  const createMutation = useCreateStockMovement({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setShowForm(false);
        setForm({ productId: "", type: "in", quantity: "", reason: "" });
        toast({ title: "Stock movement recorded" });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const handleSave = () => {
    createMutation.mutate({
      data: {
        productId: parseInt(form.productId),
        type: form.type as "in" | "out" | "adjustment",
        quantity: parseInt(form.quantity),
        reason: form.reason || undefined,
      },
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Stock movement history</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-record-movement">
          <Plus className="w-4 h-4 mr-1.5" /> Record Movement
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={productFilter} onValueChange={setProductFilter}>
          <SelectTrigger className="w-56" data-testid="select-product-filter">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !movements?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <SlidersHorizontal className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No movements recorded yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-right px-4 py-3 font-medium">Quantity</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Reason</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">By</th>
                    <th className="text-right px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const ts = TYPE_STYLES[m.type] ?? TYPE_STYLES.adjustment;
                    return (
                      <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30" data-testid={`row-movement-${m.id}`}>
                        <td className="px-4 py-3 font-medium text-foreground">{m.productName ?? `#${m.productId}`}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs ${ts.color}`}>
                            {m.type === "in" ? <TrendingUp className="w-3 h-3 mr-1 inline" /> : m.type === "out" ? <TrendingDown className="w-3 h-3 mr-1 inline" /> : null}
                            {ts.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          <span className={m.type === "in" ? "text-chart-3" : m.type === "out" ? "text-destructive" : "text-chart-2"}>
                            {m.type === "out" ? "-" : "+"}{m.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{m.reason ?? "—"}</td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{m.userName ?? "System"}</td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {format(new Date(m.createdAt), "MMM d, HH:mm")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Product*</Label>
              <Select value={form.productId} onValueChange={(v) => setForm((p) => ({ ...p, productId: v }))}>
                <SelectTrigger data-testid="select-movement-product"><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{products?.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name} (Stock: {p.quantity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type*</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger data-testid="select-movement-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Stock In</SelectItem>
                  <SelectItem value="out">Stock Out</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity*</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} data-testid="input-movement-quantity" />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input placeholder="Optional reason..." value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} data-testid="input-movement-reason" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.productId || !form.quantity || createMutation.isPending} data-testid="button-save-movement">
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
