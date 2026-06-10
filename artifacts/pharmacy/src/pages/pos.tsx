import { useState, useEffect } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, Receipt, Printer } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts, useCreateSale, getListProductsQueryKey, getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import type { Product, Sale } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("0");
  const [paymentType, setPaymentType] = useState<"cash" | "wallet" | "bank">("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [amountPaidManual, setAmountPaidManual] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: products } = useListProducts(
    { search: search || undefined },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined }), enabled: search.length > 0 } }
  );

  const createSale = useCreateSale({
    mutation: {
      onSuccess: (sale) => {
        setReceipt(sale);
        setCart([]);
        setDiscount("0");
        setAmountPaid("");
        setAmountPaidManual(false);
        setSearch("");
        setPaymentType("cash");
        qc.invalidateQueries({ queryKey: getListProductsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Sale failed";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    },
  });

  const addToCart = (product: Product) => {
    if (product.quantity === 0) {
      toast({ title: "Out of stock", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast({ title: "Insufficient stock", variant: "destructive" });
          return prev;
        }
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice }];
    });
    setSearch("");
  };

  const updateQty = (productId: number, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i;
      const next = i.quantity + delta;
      if (next <= 0) return i;
      if (next > i.product.quantity) return i;
      return { ...i, quantity: next };
    }));
  };

  const updateUnitPrice = (productId: number, price: string) => {
    const p = parseFloat(price);
    if (isNaN(p) || p < 0) return;
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, unitPrice: p } : i));
  };

  const removeItem = (productId: number) => setCart((prev) => prev.filter((i) => i.product.id !== productId));

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  useEffect(() => {
    if (!amountPaidManual) {
      setAmountPaid(total > 0 ? total.toFixed(2) : "");
    }
  }, [total, amountPaidManual]);

  const canCheckout = cart.length > 0 && paid >= total;

  const handleCheckout = () => {
    createSale.mutate({
      data: {
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.unitPrice })),
        totalAmount: total,
        discount: discountAmt,
        amountPaid: paid,
        change,
        paymentType,
      },
    });
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
      {/* Left: product search */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Search products and add to cart</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-testid="input-pos-search"
            placeholder="Search by name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        {search && (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {products?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No products found</p>
            ) : (
              products?.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={p.quantity === 0}
                  data-testid={`button-add-to-cart-${p.id}`}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.genericName} · {p.category}</p>
                    {p.barcode && <p className="text-xs font-mono text-muted-foreground/60">{p.barcode}</p>}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-primary">ETB {p.sellingPrice.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} in stock</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {!search && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Search className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Search for a product above to add to cart</p>
          </div>
        )}
      </div>

      {/* Right: cart */}
      <div className="w-full md:w-80 flex flex-col gap-3">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Cart ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-3 pt-0 space-y-2">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30" data-testid={`cart-item-${item.product.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.product.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs text-muted-foreground">ETB</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateUnitPrice(item.product.id, e.target.value)}
                        className="h-5 w-20 text-xs text-right px-1 py-0"
                        title="Unit price"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-xs font-bold w-6 text-center" data-testid={`text-qty-${item.product.id}`}>{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItem(item.product.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <p className="text-xs font-bold text-foreground w-16 text-right">
                    ETB {(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">ETB {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Discount (ETB)</span>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 h-7 text-sm text-right"
                data-testid="input-discount"
              />
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-lg text-primary" data-testid="text-total">ETB {total.toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "cash" | "wallet" | "bank")}>
                <SelectTrigger className="h-8" data-testid="select-payment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={amountPaid}
                onChange={(e) => { setAmountPaid(e.target.value); setAmountPaidManual(true); }}
                onFocus={() => setAmountPaidManual(true)}
                className="w-24 h-7 text-sm text-right"
                data-testid="input-amount-paid"
              />
            </div>
            {paid > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Change</span>
                <span className={`font-medium ${change < 0 ? "text-destructive" : "text-chart-3"}`}>ETB {change.toFixed(2)}</span>
              </div>
            )}
            <Button
              className="w-full mt-1"
              disabled={!canCheckout || createSale.isPending}
              onClick={handleCheckout}
              data-testid="button-checkout"
            >
              <Receipt className="w-4 h-4 mr-2" />
              {createSale.isPending ? "Processing..." : "Complete Sale"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Receipt dialog */}
      <Dialog open={receipt !== null} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" /> Sale Complete
            </DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-4">
              <div className="text-center border-b border-border pb-4">
                <p className="font-bold text-lg">PharmaCare</p>
                <p className="text-xs text-muted-foreground">Receipt #{String(receipt.id).padStart(4, "0")}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(receipt.createdAt), "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="space-y-1">
                {receipt.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm" data-testid={`receipt-item-${item.id}`}>
                    <span className="text-muted-foreground">{item.productName} x{item.quantity}</span>
                    <span className="font-medium">ETB {item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>ETB {(receipt.totalAmount + receipt.discount).toFixed(2)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-chart-3">-ETB {receipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">ETB {receipt.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="capitalize">{receipt.paymentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span>ETB {receipt.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Change</span>
                  <span>ETB {receipt.change.toFixed(2)}</span>
                </div>
              </div>
              <Button className="w-full" onClick={() => setReceipt(null)} data-testid="button-new-sale">
                New Sale
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
