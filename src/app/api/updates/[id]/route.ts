import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { requireUser } from "@/lib/auth";
import { assertEditable, canReadReport } from "@/lib/policies.mjs";
import { reportSchema } from "@/lib/schemas";

export const GET = api(async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context!.params;
  if (!id) throw new HttpError(400, "Report ID is required");
  const report = await db.dailyReport.findUnique({ where: { id }, include: { reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } }, user: { select: { id: true, name: true, email: true, designation: true } } } });
  if (report && !canReadReport(user, report.userId)) throw new HttpError(403, "You cannot access this report");
  if (!report) throw new HttpError(404, "Report not found");
  return Response.json({ report });
});
export const PATCH = api(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await context!.params;
  if (!id) throw new HttpError(400, "Report ID is required");
  const input = await body(request, reportSchema);
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.dailyReport.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw new HttpError(404, "Report not found");
    assertEditable(existing.status);
    return tx.dailyReport.update({ where: { id }, data: { ...input, workDate: new Date(`${input.workDate}T00:00:00.000Z`), status: input.status ?? existing.status, submittedAt: (input.status ?? existing.status) === "SUBMITTED" ? new Date() : existing.submittedAt } });
  });
  return Response.json({ report: result });
});
