import { db } from "@/lib/db";
import { api, body, HttpError } from "@/lib/http";
import { requireHead } from "@/lib/auth";
import { reviewSchema } from "@/lib/schemas";
import { assertReviewable } from "@/lib/policies.mjs";

export const POST = api(async (request: Request, context: { params: Promise<{ id: string }> }) => {
  const reviewer = await requireHead();
  const { id } = await context!.params;
  if (!id) throw new HttpError(400, "Report ID is required");
  const input = await body(request, reviewSchema);
  const { report, review } = await db.$transaction(async (tx) => {
    const existing = await tx.dailyReport.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Report not found");
    assertReviewable(existing.status);
    const updated = await tx.dailyReport.update({ where: { id }, data: { status: input.decision, reviewerComment: input.comment ?? null, reviewedAt: new Date() } });
    const review = await tx.reportReview.create({
      data: { reportId: id, reviewerId: reviewer.id, decision: input.decision, comment: input.comment ?? null },
      include: { reviewer: { select: { name: true } } },
    });
    return { report: updated, review };
  }, { isolationLevel: "Serializable" });
  return Response.json({ report, review });
});
