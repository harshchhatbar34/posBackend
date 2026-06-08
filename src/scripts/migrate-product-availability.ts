/**
 * Migration: Convert Product.isAvailable (Boolean) → Product.availability (Enum)
 *
 * Old values:
 *   isAvailable: true  → availability: "ACTIVE"
 *   isAvailable: false → availability: "INACTIVE"
 *
 * Run once:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-product-availability.ts
 */

import connectToDatabase from "@/lib/mongoose";
import mongoose from "mongoose";

async function migrate() {
  await connectToDatabase();
  const db = mongoose.connection.db!;
  const collection = db.collection("products");

  console.log("🔄 Starting migration: isAvailable → availability enum...\n");

  // Convert old true → ACTIVE
  const trueResult = await collection.updateMany(
    { isAvailable: true, availability: { $exists: false } },
    { $set: { availability: "ACTIVE" }, $unset: { isAvailable: "" } }
  );
  console.log(`✅ Converted isAvailable:true  → ACTIVE  : ${trueResult.modifiedCount} documents`);

  // Convert old false → INACTIVE
  const falseResult = await collection.updateMany(
    { isAvailable: false, availability: { $exists: false } },
    { $set: { availability: "INACTIVE" }, $unset: { isAvailable: "" } }
  );
  console.log(`✅ Converted isAvailable:false → INACTIVE: ${falseResult.modifiedCount} documents`);

  // Catch any docs that somehow have neither field — default to ACTIVE
  const fallback = await collection.updateMany(
    { availability: { $exists: false } },
    { $set: { availability: "ACTIVE" } }
  );
  if (fallback.modifiedCount > 0) {
    console.log(`⚠️  Defaulted ${fallback.modifiedCount} docs with no isAvailable field → ACTIVE`);
  }

  const total = await collection.countDocuments({});
  console.log(`\n📦 Total products in DB: ${total}`);
  console.log("🎉 Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
