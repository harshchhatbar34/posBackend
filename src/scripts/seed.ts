import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User, { Role } from "../models/User";
import Section from "../models/Section";
import Table, { TableStatus } from "../models/Table";
import Category from "../models/Category";
import Product, { ProductAvailability } from "../models/Product";
import InventoryItem, { InventoryUnit } from "../models/InventoryItem";

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not defined in the environment variables.");
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Clear existing data
  await User.deleteMany({});
  await Section.deleteMany({});
  await Table.deleteMany({});
  await Category.deleteMany({});
  await Product.deleteMany({});
  await InventoryItem.deleteMany({});
  console.log("Database cleared.");

  // ---- Create Users ----
  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const superAdmin = await User.create({
    name: "Harsh Chhatbar",
    email: "harshchhatbar34@gmail.com",
    password: hashedPassword,
    role: Role.SUPER_ADMIN,
    isActive: true,
  });

  const admin = await User.create({
    name: "Harshit Khatri",
    email: "harshitkhatri38@gmail.com",
    password: hashedPassword,
    role: Role.ADMIN,
    isActive: true,
  });

  console.log("Users seeded.");

  // ---- Create Sections & Tables ----
  const groundFloor = await Section.create({
    name: "Ground Floor",
    description: "Main dining area",
  });

  const rooftop = await Section.create({
    name: "Rooftop",
    description: "Open air dining",
  });

  const tableData = [
    { tableNumber: 1, capacity: 4, sectionId: groundFloor._id, status: TableStatus.AVAILABLE },
    { tableNumber: 2, capacity: 4, sectionId: groundFloor._id, status: TableStatus.AVAILABLE },
    { tableNumber: 3, capacity: 2, sectionId: rooftop._id, status: TableStatus.AVAILABLE },
  ];

  await Table.insertMany(tableData);
  console.log("Sections & Tables seeded.");

  // ---- Create Categories & Products ----
  const beverages = await Category.create({
    name: "Beverages",
    description: "Drinks and Refreshments",
  });

  const mains = await Category.create({
    name: "Main Course",
    description: "Hearty Meals",
  });

  const productData = [
    {
      name: "Cola",
      description: "Chilled soda",
      price: 50,
      categoryId: beverages._id,
      sectionId: groundFloor._id,
      availability: ProductAvailability.ACTIVE,
    },
    {
      name: "Paneer Butter Masala",
      description: "Rich paneer curry",
      price: 250,
      categoryId: mains._id,
      sectionId: rooftop._id,
      availability: ProductAvailability.ACTIVE,
    },
  ];

  await Product.insertMany(productData);
  console.log("Categories & Products seeded.");

  // ---- Create Inventory ----
  const inventoryData = [
    {
      name: "Tomato",
      quantity: 50,
      unit: InventoryUnit.KG,
      pricePerUnit: 30,
      minStock: 10,
    },
    {
      name: "Paneer",
      quantity: 20,
      unit: InventoryUnit.KG,
      pricePerUnit: 200,
      minStock: 5,
    },
  ];

  await InventoryItem.insertMany(inventoryData);
  console.log("Inventory seeded.");

  console.log("\n📋 Login Credentials:");
  console.log("  Super Admin: harshchhatbar34@gmail.com / Admin@123");
  console.log("  Admin:       harshitkhatri38@gmail.com / Admin@123");
}

main()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    mongoose.disconnect();
    process.exit(1);
  });
