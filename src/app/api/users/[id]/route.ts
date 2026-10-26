import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { requireHead } from "@/lib/auth";
import { z } from "zod";

const patchSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), designation: z.string().trim().min(1).max(100).optional(), active: z.boolean().optional(), email: z.email().transform((v) => v.toLowerCase()).optional() }).strict().refine((v) => Object.keys(v).length > 0);
export const PATCH = api(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const actor = await requireHead();
  const { id } = await context!.params;
  if (!id) throw new HttpError(400, "User ID is required");
  const input = await body(request, patchSchema);
  const user = await db.$transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) throw new HttpError(404, "User not found");
    if (input.active === false && target.id === actor.id) throw new HttpError(409, "You cannot deactivate your own account");
    const updated = await tx.user.update({ where: { id }, data: input, select: { id: true, name: true, email: true, designation: true, role: true, active: true, createdAt: true, _count: { select: { reports: true } } } });
    if (input.active === false) await tx.session.deleteMany({ where: { userId: id } });
    return updated;
  }, { isolationLevel: "Serializable" });
  return Response.json({ user });
});
