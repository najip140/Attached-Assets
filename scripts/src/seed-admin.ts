// Seed admin user only — safe to run on production.
// Skips insert if the admin user already exists.
// Run with: pnpm --filter @workspace/scripts run seed:admin
import { db, usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
  }

  console.log("Checking for admin user...");

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, "admin"));

  if (existing) {
    console.log("Admin user already exists — skipping.");
    console.log("\nLogin with: admin / admin123");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  await db.insert(usersTable).values({
    username: "admin",
    name: "System Admin",
    email: "admin@pharmacy.com",
    passwordHash,
    role: "admin",
  });

  console.log("Admin user created successfully!");
  console.log("\nLogin credentials:");
  console.log("  Username: admin");
  console.log("  Password: admin123");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
