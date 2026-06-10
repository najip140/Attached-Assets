import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/seed-admin", async (req, res): Promise<void> => {
  const secret = process.env.SEED_SECRET;

  if (!secret) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (req.query.secret !== secret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, "admin"));

  if (existing) {
    res.json({ ok: true, message: "Admin user already exists — no changes made." });
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db.insert(usersTable).values({
    username: "admin",
    name: "System Admin",
    email: "admin@pharmacy.com",
    passwordHash,
    role: "admin",
  });

  res.json({ ok: true, message: "Admin user created. Username: admin, Password: admin123" });
});

export default router;
