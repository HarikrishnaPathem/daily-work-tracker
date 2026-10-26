import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { requireHead } from "@/lib/auth";
const schema = z.object({ password: z.string().min(12).max(200) });
export const POST = api(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  await requireHead();
  const { id } = await context!.params;
  if (!id) throw new HttpError(400, "User ID is required");
  const { password } = await body(request, schema);
  if (!(await db.user.findUnique({ where: { id }, select: { id: true } }))) throw new HttpError(404, "User not found");
  await db.user.update({ where: { id }, data: { passwordHash: await hash(password, 12) } });
  await db.session.deleteMany({ where: { userId: id } });
  return Response.json({ ok: true });
});
