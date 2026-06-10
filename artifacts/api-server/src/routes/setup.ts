import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/auth.js";
import { count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/setup/status", async (_req, res): Promise<void> => {
  const [{ value }] = await db.select({ value: count() }).from(usersTable);
  res.json({ needsSetup: Number(value) === 0 });
});

const SetupBody = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal("")),
});

router.post("/setup", async (req, res): Promise<void> => {
  const [{ value }] = await db.select({ value: count() }).from(usersTable);
  if (Number(value) > 0) {
    res.status(403).json({ error: "Setup already completed" });
    return;
  }

  const parsed = SetupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const { username, password, name, email } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash, name, role: "admin", email: email || null })
    .returning();

  const token = signToken({ userId: user.id, username: user.username, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;
