import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const name = process.env.HEAD_NAME?.trim();
  const email = process.env.HEAD_EMAIL?.trim().toLowerCase();
  const password = process.env.HEAD_PASSWORD;
  if (!name || !email || !password || password.length < 12) throw new Error("Set HEAD_NAME, HEAD_EMAIL, and a HEAD_PASSWORD of at least 12 characters.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "HEAD") throw new Error("The configured HEAD email belongs to a USER account; refusing to change its role.");
    console.log("Initial HEAD account already exists; no changes made.");
  } else {
    await db.user.create({ data: { name, email, role: "HEAD", passwordHash: await bcrypt.hash(password, 12) } });
    console.log("Initial HEAD account created.");
  }
} finally { await db.$disconnect(); }
