import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { COOKIE } from "@/lib/auth";
import { createHash } from "node:crypto";

export const POST = api(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: createHash("sha256").update(token).digest("hex") } });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: new Date(0), path: "/" });
  return response;
});
