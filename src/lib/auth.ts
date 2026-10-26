import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";

export const COOKIE = "dwu_session";
const ttlMs = 1000 * 60 * 60 * 24 * 14;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.session.create({ data: { tokenHash: hash(token), userId, expiresAt } });
  return { token, expiresAt };
}
export const currentUser = cache(async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hash(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, name: true, email: true, designation: true, role: true, active: true, passwordHash: true } },
    },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || !session.user.active) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
});
export async function requireUser() { const user = await currentUser(); if (!user) throw new HttpError(401, "Authentication required"); return user; }
export async function requireHead() { const user = await requireUser(); if (user.role !== "HEAD") throw new HttpError(403, "HEAD access required"); return user; }
