// Database seed script
// Run: npx ts-node prisma/seed.ts

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---- Clean Slate: Wipe Existing Data ----
  console.log("🧹 Clearing old database records...");
  await prisma.orderLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.inventoryStockLog.deleteMany({});
  await prisma.inventoryUsageLog.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.user.deleteMany({});

  // ---- Create Users ----
  const hashedPassword = await bcrypt.hash("password123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "harshchhatbar34@gmail.com" },
    update: {},
    create: {
      name: "Harsh Chhatbar",
      email: "harshchhatbar34@gmail.com",
      password: hashedPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "hasrshitkhatri38@gmail.com" },
    update: {},
    create: {
      name: "Harshit Khatri",
      email: "hasrshitkhatri38@gmail.com",
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Users created");

  // ---- Create Sections ----
  const golaStore = await prisma.section.upsert({
    where: { name: "Gola Store" },
    update: {},
    create: { name: "Gola Store" },
  });

  const cafe = await prisma.section.upsert({
    where: { name: "Cafe" },
    update: {},
    create: { name: "Cafe" },
  });

  const juiceCounter = await prisma.section.upsert({
    where: { name: "Juice Counter" },
    update: {},
    create: { name: "Juice Counter" },
  });

  const iceCream = await prisma.section.upsert({
    where: { name: "Ice Cream" },
    update: {},
    create: { name: "Ice Cream" },
  });

  console.log("✅ Sections created");

  // ---- Create Tables ----
  for (const section of [golaStore, cafe, juiceCounter, iceCream]) {
    for (let i = 1; i <= 5; i++) {
      await prisma.table.upsert({
        where: {
          tableNumber_sectionId: { tableNumber: i, sectionId: section.id },
        },
        update: {},
        create: {
          tableNumber: i,
          sectionId: section.id,
        },
      });
    }
  }

  console.log("✅ Tables created");

  // ---- Create Categories ----
  const golaCategory = await prisma.category.upsert({
    where: { name: "Gola" },
    update: {},
    create: { name: "Gola" },
  });

  const beverageCategory = await prisma.category.upsert({
    where: { name: "Beverages" },
    update: {},
    create: { name: "Beverages" },
  });

  const snacksCategory = await prisma.category.upsert({
    where: { name: "Snacks" },
    update: {},
    create: { name: "Snacks" },
  });

  const iceCreamCategory = await prisma.category.upsert({
    where: { name: "Ice Cream" },
    update: {},
    create: { name: "Ice Cream" },
  });

  const juiceCategory = await prisma.category.upsert({
    where: { name: "Juice" },
    update: {},
    create: { name: "Juice" },
  });

  console.log("✅ Categories created");

  // ---- Create Products ----
  const products = [
    // Gola products
    { name: "50 Rs Gola", price: 50, categoryId: golaCategory.id, sectionId: golaStore.id },
    { name: "100 Rs Gola", price: 100, categoryId: golaCategory.id, sectionId: golaStore.id },
    { name: "150 Rs Special Gola", price: 150, categoryId: golaCategory.id, sectionId: golaStore.id },
    // Cafe products
    { name: "Cold Coffee", price: 120, categoryId: beverageCategory.id, sectionId: cafe.id },
    { name: "Hot Coffee", price: 80, categoryId: beverageCategory.id, sectionId: cafe.id },
    { name: "Cappuccino", price: 150, categoryId: beverageCategory.id, sectionId: cafe.id },
    { name: "Sandwich", price: 100, categoryId: snacksCategory.id, sectionId: cafe.id },
    { name: "Burger", price: 150, categoryId: snacksCategory.id, sectionId: cafe.id },
    // Juice products
    { name: "Orange Juice", price: 80, categoryId: juiceCategory.id, sectionId: juiceCounter.id },
    { name: "Mango Shake", price: 120, categoryId: juiceCategory.id, sectionId: juiceCounter.id },
    { name: "Watermelon Juice", price: 70, categoryId: juiceCategory.id, sectionId: juiceCounter.id },
    // Ice Cream products
    { name: "Vanilla Scoop", price: 60, categoryId: iceCreamCategory.id, sectionId: iceCream.id },
    { name: "Chocolate Sundae", price: 150, categoryId: iceCreamCategory.id, sectionId: iceCream.id },
    { name: "Butterscotch Cup", price: 100, categoryId: iceCreamCategory.id, sectionId: iceCream.id },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: `seed-${product.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: {},
      create: product,
    });
  }

  console.log("✅ Products created");

  // ---- Create Inventory Items ----
  const inventoryItems = [
    { name: "Sugar", quantity: 50, unit: "KG" as const, location: "Store Room", pricePerUnit: 40, minStock: 10 },
    { name: "Ice", quantity: 200, unit: "KG" as const, location: "Freezer", pricePerUnit: 10, minStock: 50 },
    { name: "Coffee Powder", quantity: 20, unit: "KG" as const, location: "Cafe Store", pricePerUnit: 300, minStock: 5 },
    { name: "Milk", quantity: 100, unit: "LITER" as const, location: "Refrigerator", pricePerUnit: 60, minStock: 20 },
    { name: "Cups (Large)", quantity: 500, unit: "PIECE" as const, location: "Store Room", pricePerUnit: 3, minStock: 100 },
    { name: "Napkins", quantity: 1000, unit: "PIECE" as const, location: "Store Room", pricePerUnit: 1, minStock: 200 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.create({ data: item });
  }

  console.log("✅ Inventory items created");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📋 Login Credentials:");
  console.log("  Super Admin: harshchhatbar34@gmail.com / password123");
  console.log("  Admin:       hasrshitkhatri38@gmail.com / password123");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
