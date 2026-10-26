import { db } from "@/lib/db";
import { api, body } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const profileSchema = z.object({ name: z.string().trim().min(1).max(100), designation: z.string().trim().min(1).max(100) });

export const GET = api(async () => {
  const user = await requireUser();
  return Response.json({ user: { id: user.id, name: user.name, designation: user.designation, email: user.email, role: user.role } });
});

export const PATCH = api(async (request) => {
  const user = await requireUser();
  const input = await body(request, profileSchema);
  const updated = await db.user.update({ where: { id: user.id }, data: input, select: { id: true, name: true, designation: true, email: true, role: true } });
  return Response.json({ user: updated });
});
