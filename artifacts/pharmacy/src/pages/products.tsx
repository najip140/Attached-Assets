import { useState } from "react";
import { Plus, Search, Edit2, Trash2, Package, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useListSuppliers, getListProductsQueryKey
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Antibiotics", "Analgesics", "Diabetes", "Cardiovascular", "Gastrointestinal", "Antihistamines", "Vitamins", "Other"];

type ProductForm = {
  name: string; genericName: string; category: string; barcode: string;
  batchNumber: string; supplierId: string; purchasePrice: string; sellingPrice: string;
  quantity: string; reorderLevel: string; expiryDate: string;
};

const EMPTY_FORM: ProductForm = {
  name: "", genericName: "", category: "Antibiotics", barcode: "", batchNumber: "",
  supplierId: "", purchasePrice: "", sellingPrice: "", quantity: "", reorderLevel: "10", expiryDate: "",
};

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStock, setLowStock] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: products, isLoading } = useListProducts(
    { search: search || undefined, category: categoryFilter !== "all" ? categoryFilter : undefined, lowStock: lowStock || undefined },
    { query: { queryKey: getListProductsQueryKey({ search: search || undefined, category: categoryFilter !== "all" ? categoryFilter : undefined, lowStock: lowStock || undefined }) } }
  );
  const { data: suppliers } = useListSuppliers();

  const createMutation = useCreateProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); setShowForm(false); toast({ title: "Product added" }); } } });
  const updateMutation = useUpdateProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); setShowForm(false); toast({ title: "Product updated" }); } } });
  const deleteMutation = useDeleteProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProductsQueryKey() }); toast({ title: "Product deleted" }); } } });

  const openCreate = () => { setEditProduct(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, genericName: p.genericName, category: p.category,
      barcode: p.barcode ?? "", batchNumber: p.batchNumber ?? "",
      supplierId: p.supplierId?.toString() ?? "", purchasePrice: p.purchasePrice.toString(),
      sellingPrice: p.sellingPrice.toString(), quantity: p.quantity.toString(),
      reorderLevel: p.reorderLevel.toString(), expiryDate: p.expiryDate ?? "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name, genericName: form.genericName, category: form.category,
      barcode: form.barcode || undefined, batchNumber: form.batchNumber || undefined,
      supplierId: form.supplierId ? parseInt(form.supplierId) : undefined,
      purchasePrice: parseFloat(form.purchasePrice), sellingPrice: parseFloat(form.sellingPrice),
      quantity: parseInt(form.quantity), reorderLevel: parseInt(form.reorderLevel),
      expiryDate: form.expiryDate || undefined,
    };
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const f = (k: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{products?.length ?? 0} products total</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-1.5" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-testid="input-search" placeholder="Search by name or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="select-category">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={lowStock ? "default" : "outline"} size="sm" onClick={() => setLowStock((v) => !v)} data-testid="button-low-stock-filter">
          Low Stock
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !products?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-3 font-medium">Product</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
                    <th className="text-right px-4 py-3 font-medium">Price</th>
                    <th className="text-right px-4 py-3 font-medium">Qty</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Expiry</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors" data-testid={`row-product-${p.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.genericName}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{p.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-foreground">ETB {p.sellingPrice.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">cost ETB {p.purchasePrice.toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold ${p.quantity <= p.reorderLevel ? "text-destructive" : "text-foreground"}`}>
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        {p.expiryDate ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} data-testid={`button-edit-product-${p.id}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-product-${p.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { k: "name" as const, label: "Name*", col: 2 },
              { k: "genericName" as const, label: "Generic Name*", col: 2 },
            ].map(({ k, label, col }) => (
              <div key={k} className={`space-y-1 ${col === 2 ? "col-span-2" : ""}`}>
                <Label htmlFor={k}>{label}</Label>
                <Input id={k} value={form[k]} onChange={f(k)} data-testid={`input-${k}`} />
              </div>
            ))}
            <div className="space-y-1">
              <Label>Category*</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-form-category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select value={form.supplierId} onValueChange={(v) => setForm((p) => ({ ...p, supplierId: v }))}>
                <SelectTrigger data-testid="select-supplier"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {suppliers?.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {[
              { k: "barcode" as const, label: "Barcode" },
              { k: "batchNumber" as const, label: "Batch #" },
              { k: "purchasePrice" as const, label: "Purchase Price*", type: "number" },
              { k: "sellingPrice" as const, label: "Selling Price*", type: "number" },
              { k: "quantity" as const, label: "Quantity*", type: "number" },
              { k: "reorderLevel" as const, label: "Reorder Level*", type: "number" },
              { k: "expiryDate" as const, label: "Expiry Date", type: "date" },
            ].map(({ k, label, type }) => (
              <div key={k} className="space-y-1">
                <Label htmlFor={k}>{label}</Label>
                <Input id={k} type={type ?? "text"} value={form[k]} onChange={f(k)} data-testid={`input-${k}`} />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-product">
              {editProduct ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteMutation.mutate({ id: deleteId }); setDeleteId(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
