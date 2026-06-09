// Seed script — run with: pnpm --filter @workspace/scripts run seed
import { db, usersTable, suppliersTable, productsTable, salesTable, saleItemsTable, stockMovementsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data
  await db.delete(saleItemsTable);
  await db.delete(salesTable);
  await db.delete(stockMovementsTable);
  await db.delete(usersTable);
  await db.delete(productsTable);
  await db.delete(suppliersTable);

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const pharmHash = await bcrypt.hash("pharm123", 10);
  const cashHash = await bcrypt.hash("cash123", 10);

  const [admin, pharmacist, cashier] = await db.insert(usersTable).values([
    { username: "admin", name: "System Admin", email: "admin@pharmacy.com", passwordHash: adminHash, role: "admin" },
    { username: "dr_sarah", name: "Dr. Sarah Johnson", email: "sarah@pharmacy.com", passwordHash: pharmHash, role: "pharmacist" },
    { username: "cashier1", name: "Mike Thompson", email: "mike@pharmacy.com", passwordHash: cashHash, role: "cashier" },
  ]).returning();

  console.log("Users created");

  // Suppliers
  const [sup1, sup2, sup3] = await db.insert(suppliersTable).values([
    { name: "MedPharma Distributors", contact: "James Wilson", email: "james@medpharma.com", phone: "+1-555-0101", address: "123 Medical Drive, Chicago IL" },
    { name: "HealthCare Wholesale", contact: "Linda Chen", email: "linda@hcwholesale.com", phone: "+1-555-0102", address: "456 Health Ave, New York NY" },
    { name: "Global Pharma Supply", contact: "Robert Davis", email: "robert@globalp.com", phone: "+1-555-0103", address: "789 Supply Blvd, Los Angeles CA" },
  ]).returning();

  console.log("Suppliers created");

  // Products
  const today = new Date();
  const futureDate = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const [p1, p2, p3, p4, p5, p6, p7, p8] = await db.insert(productsTable).values([
    {
      name: "Amoxicillin 500mg",
      genericName: "Amoxicillin",
      category: "Antibiotics",
      barcode: "1001001001",
      batchNumber: "AMOX-2024-001",
      supplierId: sup1.id,
      purchasePrice: "2.50",
      sellingPrice: "5.00",
      quantity: 200,
      reorderLevel: 30,
      expiryDate: futureDate(180),
    },
    {
      name: "Paracetamol 500mg",
      genericName: "Paracetamol",
      category: "Analgesics",
      barcode: "1002002002",
      batchNumber: "PARA-2024-001",
      supplierId: sup2.id,
      purchasePrice: "0.50",
      sellingPrice: "1.20",
      quantity: 500,
      reorderLevel: 100,
      expiryDate: futureDate(365),
    },
    {
      name: "Metformin 850mg",
      genericName: "Metformin HCl",
      category: "Diabetes",
      barcode: "1003003003",
      batchNumber: "MET-2024-001",
      supplierId: sup1.id,
      purchasePrice: "1.20",
      sellingPrice: "2.80",
      quantity: 8,
      reorderLevel: 20,
      expiryDate: futureDate(90),
    },
    {
      name: "Lisinopril 10mg",
      genericName: "Lisinopril",
      category: "Cardiovascular",
      barcode: "1004004004",
      batchNumber: "LIS-2024-001",
      supplierId: sup3.id,
      purchasePrice: "1.80",
      sellingPrice: "3.50",
      quantity: 150,
      reorderLevel: 25,
      expiryDate: futureDate(270),
    },
    {
      name: "Omeprazole 20mg",
      genericName: "Omeprazole",
      category: "Gastrointestinal",
      barcode: "1005005005",
      batchNumber: "OME-2024-001",
      supplierId: sup2.id,
      purchasePrice: "1.00",
      sellingPrice: "2.50",
      quantity: 5,
      reorderLevel: 20,
      expiryDate: futureDate(25),
    },
    {
      name: "Atorvastatin 40mg",
      genericName: "Atorvastatin",
      category: "Cardiovascular",
      barcode: "1006006006",
      batchNumber: "ATO-2024-001",
      supplierId: sup1.id,
      purchasePrice: "2.00",
      sellingPrice: "4.50",
      quantity: 120,
      reorderLevel: 20,
      expiryDate: futureDate(200),
    },
    {
      name: "Cetirizine 10mg",
      genericName: "Cetirizine HCl",
      category: "Antihistamines",
      barcode: "1007007007",
      batchNumber: "CET-2024-001",
      supplierId: sup3.id,
      purchasePrice: "0.80",
      sellingPrice: "1.80",
      quantity: 3,
      reorderLevel: 15,
      expiryDate: futureDate(-5),
    },
    {
      name: "Ibuprofen 400mg",
      genericName: "Ibuprofen",
      category: "Analgesics",
      barcode: "1008008008",
      batchNumber: "IBU-2024-001",
      supplierId: sup2.id,
      purchasePrice: "0.60",
      sellingPrice: "1.50",
      quantity: 300,
      reorderLevel: 50,
      expiryDate: futureDate(120),
    },
  ]).returning();

  console.log("Products created");

  // Stock movements
  await db.insert(stockMovementsTable).values([
    { productId: p1.id, type: "in", quantity: 200, reason: "Initial stock", userId: admin.id },
    { productId: p2.id, type: "in", quantity: 500, reason: "Initial stock", userId: admin.id },
    { productId: p3.id, type: "in", quantity: 50, reason: "Initial stock", userId: admin.id },
    { productId: p3.id, type: "out", quantity: 42, reason: "Sold / dispensed", userId: pharmacist.id },
    { productId: p4.id, type: "in", quantity: 150, reason: "Initial stock", userId: admin.id },
    { productId: p5.id, type: "in", quantity: 30, reason: "Initial stock", userId: admin.id },
    { productId: p5.id, type: "out", quantity: 25, reason: "Sold", userId: cashier.id },
    { productId: p6.id, type: "in", quantity: 120, reason: "Initial stock", userId: admin.id },
    { productId: p7.id, type: "in", quantity: 3, reason: "Initial stock", userId: admin.id },
    { productId: p8.id, type: "in", quantity: 300, reason: "Initial stock", userId: admin.id },
  ]);

  console.log("Stock movements created");

  // Seed some historical sales (over the past 7 days)
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - dayOffset);
    saleDate.setHours(10, 0, 0, 0);

    const numSales = 2 + Math.floor(Math.random() * 4);
    for (let s = 0; s < numSales; s++) {
      const saleTime = new Date(saleDate);
      saleTime.setMinutes(s * 40);

      const qty1 = 1 + Math.floor(Math.random() * 3);
      const qty2 = 1 + Math.floor(Math.random() * 2);
      const total = qty1 * 5.00 + qty2 * 1.20;

      const [sale] = await db.insert(salesTable).values({
        userId: dayOffset % 2 === 0 ? cashier.id : pharmacist.id,
        totalAmount: total.toString(),
        discount: "0",
        amountPaid: (total + 5).toString(),
        change: "5",
        createdAt: saleTime,
      }).returning();

      await db.insert(saleItemsTable).values([
        { saleId: sale.id, productId: p1.id, quantity: qty1, unitPrice: "5.00", subtotal: (qty1 * 5.00).toString() },
        { saleId: sale.id, productId: p2.id, quantity: qty2, unitPrice: "1.20", subtotal: (qty2 * 1.20).toString() },
      ]);
    }
  }

  console.log("Sales seeded");
  console.log("\nSeed complete!");
  console.log("\nLogin credentials:");
  console.log("  Admin:       admin / admin123");
  console.log("  Pharmacist:  dr_sarah / pharm123");
  console.log("  Cashier:     cashier1 / cash123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
