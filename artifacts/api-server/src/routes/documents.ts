import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, documentsTable, usersTable } from "@workspace/db";
import { authenticate, requireRole } from "../lib/auth.js";
import path from "path";
import fs from "fs";
import { z } from "zod";

const router: IRouter = Router();

router.use(authenticate);
router.use(requireRole("admin"));

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "documents");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function formatDocument(doc: typeof documentsTable.$inferSelect & { createdByName?: string | null }) {
  return {
    id: doc.id,
    title: doc.title,
    category: doc.category,
    description: doc.description ?? null,
    fileName: doc.fileName,
    filePath: doc.filePath,
    fileSize: doc.fileSize ?? null,
    mimeType: doc.mimeType ?? null,
    createdBy: doc.createdBy ?? null,
    createdByName: doc.createdByName ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const DocumentUploadSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  fileName: z.string().min(1),
  fileData: z.string().min(1),
  mimeType: z.string().optional(),
});

const DocumentUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
});

const ListDocumentsSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});

router.get("/documents", async (req, res): Promise<void> => {
  const query = ListDocumentsSchema.safeParse(req.query);
  const params = query.success ? query.data : {};

  const conditions = [];
  if (params.search) {
    const s = `%${params.search}%`;
    conditions.push(ilike(documentsTable.title, s));
  }
  if (params.category) {
    conditions.push(eq(documentsTable.category, params.category));
  }

  const rows = await db
    .select({ doc: documentsTable, createdByName: usersTable.name })
    .from(documentsTable)
    .leftJoin(usersTable, eq(documentsTable.createdBy, usersTable.id))
    .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>])) : undefined)
    .orderBy(sql`${documentsTable.createdAt} DESC`);

  res.json(rows.map(({ doc, createdByName }) => ({
    ...formatDocument({ ...doc, createdByName }),
  })));
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select({ doc: documentsTable, createdByName: usersTable.name })
    .from(documentsTable)
    .leftJoin(usersTable, eq(documentsTable.createdBy, usersTable.id))
    .where(eq(documentsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(formatDocument({ ...row.doc, createdByName: row.createdByName }));
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = DocumentUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  ensureUploadsDir();

  const { title, category, description, fileName, fileData, mimeType } = parsed.data;

  const base64Data = fileData.includes(",") ? fileData.split(",")[1] : fileData;
  const buffer = Buffer.from(base64Data, "base64");
  const fileSize = buffer.length;

  const ext = path.extname(fileName);
  const safeFileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, safeFileName);

  fs.writeFileSync(filePath, buffer);

  const [doc] = await db.insert(documentsTable).values({
    title,
    category,
    description,
    fileName,
    filePath: `/api/documents/file/${safeFileName}`,
    fileSize,
    mimeType,
    createdBy: req.user!.userId,
    updatedAt: new Date(),
  }).returning();

  res.status(201).json(formatDocument(doc));
});

router.patch("/documents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const parsed = DocumentUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [row] = await db
    .update(documentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(documentsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  res.json(formatDocument(row));
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db.delete(documentsTable).where(eq(documentsTable.id, id)).returning();
  if (!row) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  const physicalPath = path.join(UPLOADS_DIR, path.basename(row.filePath));
  if (fs.existsSync(physicalPath)) {
    fs.unlinkSync(physicalPath);
  }

  res.json({ message: "Document deleted" });
});

router.get("/documents/file/:filename", async (req, res): Promise<void> => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.sendFile(filePath);
});

export default router;
