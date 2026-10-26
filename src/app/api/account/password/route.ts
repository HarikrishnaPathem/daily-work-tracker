import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { requireUser, COOKIE } from "@/lib/auth";

const schema = z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200) });

export const POST = api(async (request) => {
  const user = await requireUser();
  const input = await body(request, schema);
  if (!(await compare(input.currentPassword, user.passwordHash))) throw new HttpError(400, "Current password is incorrect");
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hash(input.newPassword, 12) } }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  const response = NextResponse.json({ ok: true, message: "Password changed. Sign in again with the new password." });
  response.cookies.set(COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", expires: new Date(0), path: "/" });
  return response;
});
