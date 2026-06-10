import { useState } from "react";
import { Calendar, CheckCircle, Clock, TrendingUp, DollarSign, BarChart2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface EndOfDayRecord {
  id: number;
  date: string;
  totalCashSales: number;
  totalWalletSales: number;
  totalBankSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  notes: string | null;
  closedBy: number | null;
  closedByName: string | null;
  closedAt: string;
  createdAt: string;
}

interface EndOfDayPreview {
  date: string;
  totalCashSales: number;
  totalWalletSales: number;
  totalBankSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalTransactions: number;
  alreadyClosed: boolean;
}

function apiUrl(path: string) { return `/api${path}`; }

function SummaryCard({ title, value, icon: Icon, color = "text-primary" }: { title: string; value: string; icon: React.ElementType; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
          <Icon className="w-8 h-8 text-primary/20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function EndOfDayPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: preview, isLoading: previewLoading } = useQuery<EndOfDayPreview>({
    queryKey: ["eod-preview", selectedDate],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/end-of-day/preview?date=${selectedDate}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load preview");
      return res.json();
    },
    enabled: !!token && !!selectedDate,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery<EndOfDayRecord[]>({
    queryKey: ["eod-history"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/end-of-day?limit=30"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    enabled: !!token,
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/end-of-day"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: selectedDate, notes: notes || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to close day"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eod-preview", selectedDate] });
      qc.invalidateQueries({ queryKey: ["eod-history"] });
      setShowConfirm(false);
      setNotes("");
      toast({ title: "Day closed successfully" });
    },
    onError: (e: Error) => {
      setShowConfirm(false);
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">End of Day</h1>
        <p className="text-sm text-muted-foreground">Close daily sales and generate summary</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Close day form */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Close Day
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={today} />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea className="mt-1" rows={3} placeholder="Any closing notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {preview?.alreadyClosed ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-500">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">This day has been closed</p>
                </div>
              ) : (
                <Button
                  className="w-full"
                  onClick={() => setShowConfirm(true)}
                  disabled={previewLoading || !preview}
                >
                  <Clock className="w-4 h-4 mr-2" /> Close Day
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-2 space-y-4">
          {previewLoading ? (
            <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
          ) : preview ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <SummaryCard title="Cash Sales" value={`ETB ${preview.totalCashSales.toFixed(2)}`} icon={DollarSign} />
                <SummaryCard title="Wallet Sales" value={`ETB ${preview.totalWalletSales.toFixed(2)}`} icon={DollarSign} />
                <SummaryCard title="Bank Sales" value={`ETB ${preview.totalBankSales.toFixed(2)}`} icon={DollarSign} />
                <SummaryCard title="Total Revenue" value={`ETB ${preview.totalRevenue.toFixed(2)}`} icon={TrendingUp} color="text-chart-1" />
                <SummaryCard title="Total Profit" value={`ETB ${preview.totalProfit.toFixed(2)}`} icon={TrendingUp} color="text-chart-2" />
                <SummaryCard title="Transactions" value={String(preview.totalTransactions)} icon={BarChart2} />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Closing History</h2>
        {historyLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No closing records yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((eod) => (
              <Card key={eod.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <p className="font-semibold text-sm text-foreground">{eod.date}</p>
                        <Badge variant="outline" className="text-[10px]">{eod.totalTransactions} txns</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Closed by {eod.closedByName ?? "Unknown"} · {format(new Date(eod.closedAt), "MMM d, yyyy h:mm a")}
                      </p>
                      {eod.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{eod.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">ETB {eod.totalRevenue.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-xs text-chart-2 font-medium">ETB {eod.totalProfit.toFixed(2)} profit</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-3 gap-3 text-xs text-center">
                    <div>
                      <p className="text-muted-foreground">Cash</p>
                      <p className="font-semibold">ETB {eod.totalCashSales.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Wallet</p>
                      <p className="font-semibold">ETB {eod.totalWalletSales.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bank</p>
                      <p className="font-semibold">ETB {eod.totalBankSales.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={(o) => !o && setShowConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirm Day Closing</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Close day <strong>{selectedDate}</strong> with the following summary?</p>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cash</span><span>ETB {preview.totalCashSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span>ETB {preview.totalWalletSales.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank</span><span>ETB {preview.totalBankSales.toFixed(2)}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total Revenue</span><span>ETB {preview.totalRevenue.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Profit</span><span>ETB {preview.totalProfit.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transactions</span><span>{preview.totalTransactions}</span></div>
              </div>
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> This action cannot be undone.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "Closing..." : "Confirm Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
