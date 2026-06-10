import { useState } from "react";
import { Plus, RotateCcw, AlertTriangle, Search as SearchIcon, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import { format } from "date-fns";

interface LossRecord {
  id: number;
  type: "return" | "damaged" | "lost";
  productId: number;
  productName: string | null;
  quantity: number;
  reason: string | null;
  userId: number | null;
  userName: string | null;
  createdAt: string;
}

function apiUrl(path: string) { return `/api${path}`; }

const TYPE_CONFIG = {
  return: { label: "Stock Return", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: RotateCcw },
  damaged: { label: "Damaged", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
  lost: { label: "Lost", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: SearchIcon },
};

function useLossRecords(type?: string, from?: string, to?: string) {
  const { token } = useAuth();
  const params = new URLSearchParams();
  if (type && type !== "all") params.set("type", type);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return useQuery<LossRecord[]>({
    queryKey: ["inventory-loss", type, from, to],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/inventory-loss?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load records");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function InventoryLossPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"return" | "damaged" | "lost">("return");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const { data: records = [], isLoading } = useLossRecords(activeTab, fromDate, toDate);

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; productId: number; quantity: number; reason?: string }) => {
      const res = await fetch(apiUrl("/inventory-loss"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to create record"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory-loss"] });
      setShowForm(false);
      toast({ title: "Record created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Inventory Loss Management</h1>
          <p className="text-sm text-muted-foreground">Track stock returns, damaged, and lost products</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Record Loss
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">From:</Label>
          <Input type="date" className="w-38 h-8 text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs whitespace-nowrap">To:</Label>
          <Input type="date" className="w-38 h-8 text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="return">Returns</TabsTrigger>
          <TabsTrigger value="damaged">Damaged</TabsTrigger>
          <TabsTrigger value="lost">Lost</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No records found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((rec) => {
                const cfg = TYPE_CONFIG[rec.type];
                const Icon = cfg.icon;
                return (
                  <Card key={rec.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground truncate">{rec.productName ?? "Unknown Product"}</p>
                              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border shrink-0 ${cfg.color}`}>
                                {cfg.label}
                              </Badge>
                            </div>
                            {rec.reason && <p className="text-xs text-muted-foreground truncate mt-0.5">{rec.reason}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              By {rec.userName ?? "Unknown"} · {format(new Date(rec.createdAt), "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-foreground">{rec.quantity}</p>
                          <p className="text-xs text-muted-foreground">units</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LossFormDialog
        open={showForm}
        initialType={formType}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  );
}

function LossFormDialog({ open, initialType, onClose, onSubmit, loading }: {
  open: boolean;
  initialType: "return" | "damaged" | "lost";
  onClose: () => void;
  onSubmit: (data: { type: string; productId: number; quantity: number; reason?: string }) => void;
  loading: boolean;
}) {
  const [type, setType] = useState<string>(initialType);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");

  const { data: products } = useListProducts(
    { search: search || undefined },
    { query: { enabled: search.length > 0 } }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    onSubmit({ type, productId: parseInt(productId), quantity: parseInt(quantity), reason: reason || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Inventory Loss</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="return">Stock Return</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Product *</Label>
            <Input
              className="mt-1"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && products && products.length > 0 && (
              <div className="mt-1 border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex justify-between"
                    onClick={() => { setProductId(String(p.id)); setSearch(p.name); }}
                  >
                    <span>{p.name}</span>
                    <span className="text-muted-foreground text-xs">{p.quantity} in stock</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label>Quantity *</Label>
            <Input type="number" min="1" className="mt-1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div>
            <Label>Reason</Label>
            <Textarea className="mt-1" rows={2} placeholder="Reason for loss..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!productId || !type || loading}>
              {loading ? "Saving..." : "Record Loss"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
