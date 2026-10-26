import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { api, body } from "@/lib/http";
import { requireHead } from "@/lib/auth";
import { userSchema } from "@/lib/schemas";
import { createManagedUserData } from "@/lib/user-creation.mjs";
import { managedUserListWhere } from "@/lib/user-list.mjs";

export const GET = api(async () => {
  const actor = await requireHead();
  const users = await db.user.findMany({ where: managedUserListWhere(actor.id), orderBy: { name: "asc" }, select: { id: true, name: true, email: true, designation: true, role: true, active: true, createdAt: true, _count: { select: { reports: true } } } });
  return Response.json({ users });
});
export const POST = api(async (request) => {
  await requireHead();
  const input = await body(request, userSchema);
  const passwordHash = await hash(input.password, 12);
  const user = await db.user.create({ data: createManagedUserData(input, passwordHash), select: { id: true, name: true, email: true, designation: true, role: true, active: true, createdAt: true, _count: { select: { reports: true } } } });
  return Response.json({ user }, { status: 201 });
});
