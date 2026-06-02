import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User, { Role } from "../models/User";

dotenv.config();

async function createUsers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined.");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const usersToCreate = [
    { name: "Dinesh", email: "dinesh@pos.com", password: "Dinesh@123", role: Role.ADMIN },
    { name: "Mahesh", email: "mahesh@pos.com", password: "Mahesh@123", role: Role.CHEF },
    { name: "Sahil",  email: "sahil@pos.com",  password: "Sahil@123",  role: Role.HELPER },
    { name: "Nitesh", email: "nitesh@pos.com", password: "Nitesh@123", role: Role.HELPER },
  ];

  for (const u of usersToCreate) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`⚠️  Skipped (already exists): ${u.name} <${u.email}>`);
      continue;
    }
    const hashedPassword = await bcrypt.hash(u.password, 12);
    await User.create({ name: u.name, email: u.email, password: hashedPassword, role: u.role, isActive: true });
    console.log(`✅ Created: ${u.name} (${u.role}) — ${u.email} / ${u.password}`);
  }

  console.log("\n✅ Done! All users created.");
}

createUsers()
  .then(() => { mongoose.disconnect(); process.exit(0); })
  .catch((e) => { console.error(e); mongoose.disconnect(); process.exit(1); });
