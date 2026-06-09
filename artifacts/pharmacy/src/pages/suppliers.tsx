import { useState } from "react";
import { Plus, Edit2, Trash2, Truck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, getListSuppliersQueryKey } from "@workspace/api-client-react";
import type { Supplier } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type SupplierForm = { name: string; contact: string; email: string; phone: string; address: string };
const EMPTY: SupplierForm = { name: "", contact: "", email: "", phone: "", address: "" };

export default function SuppliersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierForm>(EMPTY);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useListSuppliers();
  const createMutation = useCreateSupplier({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setShowForm(false); toast({ title: "Supplier added" }); } } });
  const updateMutation = useUpdateSupplier({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); setShowForm(false); toast({ title: "Supplier updated" }); } } });
  const deleteMutation = useDeleteSupplier({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListSuppliersQueryKey() }); toast({ title: "Supplier deleted" }); } } });

  const openCreate = () => { setEditSupplier(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ name: s.name, contact: s.contact ?? "", email: s.email ?? "", phone: s.phone ?? "", address: s.address ?? "" });
    setShowForm(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      contact: form.contact || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
    };
    if (editSupplier) {
      updateMutation.mutate({ id: editSupplier.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const f = (k: keyof SupplierForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{suppliers?.length ?? 0} suppliers registered</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-supplier">
          <Plus className="w-4 h-4 mr-1.5" /> Add Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !suppliers?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Truck className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No suppliers added yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-3 font-medium">Name</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Phone</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30" data-testid={`row-supplier-${s.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{s.name}</p>
                            {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{s.contact ?? "—"}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{s.email ?? "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{s.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)} data-testid={`button-edit-supplier-${s.id}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)} data-testid={`button-delete-supplier-${s.id}`}>
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editSupplier ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { k: "name" as const, label: "Supplier Name*" },
              { k: "contact" as const, label: "Contact Person" },
              { k: "email" as const, label: "Email", type: "email" },
              { k: "phone" as const, label: "Phone", type: "tel" },
              { k: "address" as const, label: "Address" },
            ].map(({ k, label, type }) => (
              <div key={k} className="space-y-1.5">
                <Label>{label}</Label>
                <Input type={type ?? "text"} value={form[k]} onChange={f(k)} data-testid={`input-supplier-${k}`} />
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || createMutation.isPending || updateMutation.isPending} data-testid="button-save-supplier">
              {editSupplier ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the supplier.</AlertDialogDescription>
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
