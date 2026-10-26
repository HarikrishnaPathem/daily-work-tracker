import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { COOKIE, createSession } from "@/lib/auth";

export const POST = api(async (request) => {
  const input = await body(request, loginSchema);
  const user = await db.user.findUnique({ where: { email: input.email }, select: { id: true, name: true, designation: true, email: true, role: true, active: true, passwordHash: true } });
  if (!user || !user.active || !(await compare(input.password, user.passwordHash))) throw new HttpError(401, "Invalid email or password");
  const session = await createSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, name: user.name, designation: user.designation, email: user.email, role: user.role } });
  response.cookies.set(COOKIE, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: session.expiresAt, path: "/" });
  return response;
});
