import { useState, useRef } from "react";
import { Search, Plus, Trash2, Edit2, FileText, Download, X, Upload, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DOCUMENT_CATEGORIES = [
  "Purchase Invoices",
  "Supplier Documents",
  "Licenses",
  "Regulatory Documents",
  "Internal Documents",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Purchase Invoices": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Supplier Documents": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "Licenses": "bg-green-500/20 text-green-400 border-green-500/30",
  "Regulatory Documents": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Internal Documents": "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

interface DocumentRecord {
  id: number;
  title: string;
  category: string;
  description: string | null;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

function apiUrl(path: string) {
  return `/api${path}`;
}

function useDocuments(search?: string, category?: string) {
  const { token } = useAuth();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category && category !== "all") params.set("category", category);
  return useQuery<DocumentRecord[]>({
    queryKey: ["documents", search, category],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/documents?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !!token,
  });
}

export default function DocumentsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [editDoc, setEditDoc] = useState<DocumentRecord | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: documents = [], isLoading } = useDocuments(search, filterCategory);

  const uploadMutation = useMutation({
    mutationFn: async (body: object) => {
      const res = await fetch(apiUrl("/documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Upload failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setShowUpload(false);
      toast({ title: "Document uploaded" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: object }) => {
      const res = await fetch(apiUrl(`/documents/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Update failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setEditDoc(null);
      toast({ title: "Document updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(apiUrl(`/documents/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Delete failed"); }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      setDeleteId(null);
      toast({ title: "Document deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Documents</h1>
          <p className="text-sm text-muted-foreground">Manage pharmacy documents and files</p>
        </div>
        <Button onClick={() => setShowUpload(true)} data-testid="button-upload-document">
          <Upload className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No documents found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover:bg-muted/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${CATEGORY_COLORS[doc.category] ?? ""}`}>
                          {doc.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{doc.fileName}</span>
                        <span className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                      </div>
                      {doc.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{doc.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded by {doc.createdByName ?? "Unknown"} · {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditDoc(doc)} title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(doc.id)} title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSubmit={(data) => uploadMutation.mutate(data)}
        loading={uploadMutation.isPending}
      />

      {/* Edit Dialog */}
      {editDoc && (
        <EditDialog
          doc={editDoc}
          open
          onClose={() => setEditDoc(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editDoc.id, data })}
          loading={updateMutation.isPending}
        />
      )}

      {/* Delete Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Document</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete the document and its file. This cannot be undone.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadDialog({ open, onClose, onSubmit, loading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: object) => void;
  loading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ title: "", category: "", description: "" });
  const [file, setFile] = useState<File | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); if (!form.title) setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, "") })); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !form.category) return;
    const reader = new FileReader();
    reader.onload = () => {
      onSubmit({
        title: form.title,
        category: form.category,
        description: form.description || undefined,
        fileName: file.name,
        fileData: reader.result as string,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>File *</Label>
            <div
              className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
          <div>
            <Label>Title *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!file || !form.title || !form.category || loading}>
              {loading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ doc, open, onClose, onSubmit, loading }: {
  doc: DocumentRecord;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: object) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ title: doc.title, category: doc.category, description: doc.description ?? "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title: form.title, category: form.category, description: form.description || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input className="mt-1" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          </div>
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!form.title || !form.category || loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
