import { useState, useRef } from "react";
import { Download, Upload, Plus, Trash2, RefreshCw, Shield, Database, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BackupRecord {
  id: number;
  filename: string;
  fileSize: number;
  type: string;
  notes: string | null;
  createdAt: string;
  createdByName: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function typeBadge(type: string) {
  if (type === "manual") return <Badge className="bg-primary/10 text-primary border-primary/20 border text-[10px]">Manual</Badge>;
  if (type === "auto") return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 border text-[10px]">Auto</Badge>;
  if (type === "pre-restore") return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 border text-[10px]">Safety</Badge>;
  return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
}

export default function BackupPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [restoreFile, setRestoreFile] = useState<{ name: string; content: string } | null>(null);
  const [restoring, setRestoring] = useState(false);

  const token = localStorage.getItem("pharmacy_token");
  const headers = { Authorization: `Bearer ${token}` };

  const { data: backups, isLoading } = useQuery<BackupRecord[]>({
    queryKey: ["backups"],
    queryFn: async () => {
      const res = await fetch("/api/backups", { headers });
      if (!res.ok) throw new Error("Failed to load backups");
      return res.json();
    },
  });

  const { data: dbStatus } = useQuery<{ connected: boolean; lastBackupAt: string | null; totalBackups: number }>({
    queryKey: ["db-status"],
    queryFn: async () => {
      const res = await fetch("/api/backups/db-status", { headers });
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/backups", { method: "POST", headers: { ...headers, "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Backup failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["db-status"] });
      toast({ title: "Backup created", description: "Your data has been backed up successfully." });
    },
    onError: () => toast({ title: "Backup failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/backups/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["db-status"] });
      toast({ title: "Backup deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const handleDownload = async (backup: BackupRecord) => {
    const res = await fetch(`/api/backups/${backup.id}/download`, { headers });
    if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      try {
        const parsed = JSON.parse(content);
        if (!parsed.version || !parsed.tables) {
          toast({ title: "Invalid backup file", description: "This file does not appear to be a valid PharmaCare backup.", variant: "destructive" });
          return;
        }
        setRestoreFile({ name: file.name, content });
      } catch {
        toast({ title: "Invalid file", description: "Could not parse the backup file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    try {
      const res = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ backupData: restoreFile.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restore failed");
      qc.invalidateQueries({ queryKey: ["backups"] });
      qc.invalidateQueries({ queryKey: ["db-status"] });
      toast({ title: "Restore complete", description: "Database has been restored. A safety backup was created automatically." });
      setRestoreFile(null);
    } catch (err) {
      toast({ title: "Restore failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const daysSinceBackup = dbStatus?.lastBackupAt
    ? Math.floor((Date.now() - new Date(dbStatus.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const backupHealth = daysSinceBackup === null ? "none" : daysSinceBackup === 0 ? "good" : daysSinceBackup <= 1 ? "ok" : "stale";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Backup & Restore</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage database backups and restore points</p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Backup
        </Button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${dbStatus?.connected ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Database Status</p>
              <p className="text-sm font-semibold mt-0.5">
                {dbStatus === undefined ? "Checking..." : dbStatus.connected ? "Connected" : "Disconnected"}
              </p>
              {dbStatus?.connected && <div className="flex items-center gap-1 mt-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] text-green-600">PostgreSQL</span></div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Backup</p>
              <p className="text-sm font-semibold mt-0.5">
                {dbStatus?.lastBackupAt ? format(new Date(dbStatus.lastBackupAt), "MMM d, yyyy") : "Never"}
              </p>
              {dbStatus?.lastBackupAt && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(dbStatus.lastBackupAt), "h:mm a")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${backupHealth === "good" ? "bg-green-500/10 text-green-600" : backupHealth === "ok" ? "bg-amber-500/10 text-amber-600" : "bg-destructive/10 text-destructive"}`}>
              {backupHealth === "good" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Backup Health</p>
              <p className="text-sm font-semibold mt-0.5">
                {backupHealth === "none" ? "No backups" : backupHealth === "good" ? "Up to date" : backupHealth === "ok" ? "1 day ago" : `${daysSinceBackup} days old`}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{dbStatus?.totalBackups ?? 0} total backup{(dbStatus?.totalBackups ?? 0) !== 1 ? "s" : ""}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Restore from file */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Restore from File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
          {!restoreFile ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">Click to select backup file</p>
              <p className="text-xs text-muted-foreground mt-1">Accepts .json backup files exported from this system</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Shield className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-700">Ready to restore: <span className="font-mono font-normal text-xs">{restoreFile.name}</span></p>
                  <p className="text-xs text-amber-600 mt-0.5">A safety backup will be created automatically before restoring. All current data will be replaced.</p>
                </div>
                <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground" onClick={() => setRestoreFile(null)}>Cancel</Button>
              </div>
              <Button variant="destructive" onClick={handleRestore} disabled={restoring} className="w-full">
                {restoring ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restoring...</> : <><RefreshCw className="w-4 h-4 mr-2" />Confirm & Restore Database</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup history */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" /> Backup History
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["backups"] })}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          ) : !backups?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No backups yet. Create your first backup now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b border-border">
                    <th className="text-left pb-2.5 font-medium">Filename</th>
                    <th className="text-left pb-2.5 font-medium">Type</th>
                    <th className="text-left pb-2.5 font-medium">Size</th>
                    <th className="text-left pb-2.5 font-medium">Created By</th>
                    <th className="text-left pb-2.5 font-medium">Date</th>
                    <th className="text-right pb-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-mono text-xs text-foreground truncate max-w-[200px]">{b.filename}</p>
                        {b.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{b.notes}</p>}
                      </td>
                      <td className="py-3 pr-4">{typeBadge(b.type)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{formatBytes(b.fileSize)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{b.createdByName ?? "System"}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <div>{format(new Date(b.createdAt), "MMM d, yyyy")}</div>
                        <div className="text-[10px]">{format(new Date(b.createdAt), "h:mm a")}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDownload(b)}>
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(b.id)}
                          >
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

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the backup file and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
