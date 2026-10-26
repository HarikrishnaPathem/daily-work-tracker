import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireUser } from "@/lib/auth";

export const GET = api(async () => {
  const user = await requireUser();
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(todayStart); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const trendStart = new Date(todayStart); trendStart.setUTCDate(trendStart.getUTCDate() - 6);
  const [reports, counts, submittedCount, trendEntries] = await Promise.all([
    db.dailyReport.findMany({
      where: { userId: user.id },
      include: { reviews: { include: { reviewer: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
      orderBy: { workDate: "desc" },
      take: 60,
    }),
    db.dailyReport.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
    db.dailyReport.count({ where: { userId: user.id, submittedAt: { not: null } } }),
    db.dailyReport.findMany({ where: { userId: user.id, submittedAt: { gte: trendStart, lt: tomorrow } }, select: { submittedAt: true } }),
  ]);
  const todayReport = reports.find((report) => report.workDate >= todayStart && report.workDate < tomorrow) ?? null;
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(trendStart); day.setUTCDate(day.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: trendEntries.filter((entry) => entry.submittedAt?.toISOString().slice(0, 10) === key).length };
  });
  return Response.json({ reports, todayReport, counts: Object.fromEntries(counts.map((entry) => [entry.status, entry._count._all])), summary: { submitted: submittedCount, pendingReviews: counts.find((entry) => entry.status === "SUBMITTED")?._count._all ?? 0, approved: counts.find((entry) => entry.status === "APPROVED")?._count._all ?? 0, rejected: counts.find((entry) => entry.status === "REJECTED")?._count._all ?? 0, dailyTrend } });
});
