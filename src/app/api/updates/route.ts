import { db } from "@/lib/db";
import { api, body } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { reportSchema } from "@/lib/schemas";

export const GET = api(async () => {
  const user = await requireUser();
  const reports = await db.dailyReport.findMany({ where: user.role === "HEAD" ? {} : { userId: user.id }, include: { user: { select: { id: true, name: true, email: true, designation: true } }, reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, }, orderBy: { workDate: "desc" } });
  return Response.json({ reports });
});
export const POST = api(async (request) => {
  const user = await requireUser();
  const input = await body(request, reportSchema);
  const report = await db.dailyReport.create({ data: { ...input, workDate: new Date(`${input.workDate}T00:00:00.000Z`), userId: user.id, status: input.status ?? "DRAFT", submittedAt: input.status === "SUBMITTED" ? new Date() : null } });
  return Response.json({ report }, { status: 201 });
});
