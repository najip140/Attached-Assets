import { useState } from "react";
import { Plus, Edit2, Trash2, Users, Shield } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
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
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  pharmacist: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
  cashier: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
};

type UserForm = { username: string; name: string; email: string; role: string; password: string };
const EMPTY: UserForm = { username: "", name: "", email: "", role: "cashier", password: "" };

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: me } = useAuth();

  const { data: users, isLoading } = useListUsers();

  const createMutation = useCreateUser({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setShowForm(false); toast({ title: "User created" }); } } });
  const updateMutation = useUpdateUser({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); setShowForm(false); toast({ title: "User updated" }); } } });
  const deleteMutation = useDeleteUser({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListUsersQueryKey() }); toast({ title: "User deleted" }); } } });

  const openCreate = () => { setEditUser(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ username: u.username, name: u.name, email: u.email ?? "", role: u.role, password: "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (editUser) {
      updateMutation.mutate({ id: editUser.id, data: { name: form.name, email: form.email || undefined, role: form.role as "admin" | "pharmacist" | "cashier", password: form.password || undefined } });
    } else {
      createMutation.mutate({ data: { username: form.username, name: form.name, email: form.email || undefined, role: form.role as "admin" | "pharmacist" | "cashier", password: form.password } });
    }
  };

  const f = (k: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage system users and roles</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-1.5" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : !users?.length ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Username</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Email</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30" data-testid={`row-user-${u.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">{u.name}</span>
                          {u.id === me?.id && <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground">{u.username}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[u.role] ?? ""}`}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{u.email ?? "—"}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-right text-xs text-muted-foreground">
                        {format(new Date(u.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} data-testid={`button-edit-user-${u.id}`}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)} disabled={u.id === me?.id} data-testid={`button-delete-user-${u.id}`}>
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
          <DialogHeader><DialogTitle>{editUser ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {!editUser && (
              <div className="space-y-1.5">
                <Label>Username*</Label>
                <Input value={form.username} onChange={f("username")} data-testid="input-username" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Full Name*</Label>
              <Input value={form.name} onChange={f("name")} data-testid="input-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={f("email")} data-testid="input-email" />
            </div>
            <div className="space-y-1.5">
              <Label>Role*</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger data-testid="select-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pharmacist">Pharmacist</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editUser ? "New Password (leave blank to keep)" : "Password*"}</Label>
              <Input type="password" value={form.password} onChange={f("password")} data-testid="input-password" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-user">
              {editUser ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the user account.</AlertDialogDescription>
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
