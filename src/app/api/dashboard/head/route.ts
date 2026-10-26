import { db } from "@/lib/db";
import { api } from "@/lib/http";
import { requireHead } from "@/lib/auth";
import { z } from "zod";

export const GET = api(async (request) => {
  await requireHead();
  const url = new URL(request.url);
  const filters = z.object({
    userId: z.string().uuid().optional(),
    status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  }).refine((value) => !value.from || !value.to || value.from <= value.to, { message: "The from date must be on or before the to date" }).parse(Object.fromEntries(url.searchParams));
  const dateRange = filters.from || filters.to ? {
    workDate: {
      ...(filters.from ? { gte: new Date(`${filters.from}T00:00:00.000Z`) } : {}),
      ...(filters.to ? { lte: new Date(`${filters.to}T00:00:00.000Z`) } : {}),
    },
  } : {};
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrow = new Date(todayStart); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const weekStart = new Date(todayStart); weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const trendStart = new Date(todayStart); trendStart.setUTCDate(trendStart.getUTCDate() - 6);
  const [reports, activeUsers, submittedToday, statusCounts, weeklyCount, monthlyCount, submittedTrend, team] = await Promise.all([
    db.dailyReport.findMany({
      where: { ...(filters.userId ? { userId: filters.userId } : {}), ...(filters.status ? { status: filters.status } : {}), ...dateRange },
      select: { id: true, workDate: true, status: true, submittedAt: true, user: { select: { id: true, name: true, email: true, designation: true } } },
      orderBy: [{ workDate: "desc" }, { updatedAt: "desc" }],
      take: 6,
    }),
    db.user.count({ where: { role: "USER", active: true } }),
    db.dailyReport.count({ where: { submittedAt: { gte: todayStart, lt: tomorrow } } }),
    db.dailyReport.groupBy({ by: ["status"], _count: { _all: true } }),
    db.dailyReport.count({ where: { workDate: { gte: weekStart }, status: { in: ["SUBMITTED", "APPROVED"] } } }),
    db.dailyReport.count({ where: { workDate: { gte: monthStart }, status: { in: ["SUBMITTED", "APPROVED"] } } }),
    db.dailyReport.findMany({ where: { submittedAt: { gte: trendStart, lt: tomorrow } }, select: { submittedAt: true, status: true } }),
    db.user.findMany({
      where: { role: "USER", active: true },
      select: { id: true, name: true, designation: true, email: true, reports: { orderBy: { workDate: "desc" }, take: 1, select: { id: true, workDate: true, status: true, submittedAt: true, completedTasks: true, ongoingTasks: true, blockers: true, nextSteps: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(trendStart); day.setUTCDate(day.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { date: key, count: submittedTrend.filter((report) => report.submittedAt?.toISOString().slice(0, 10) === key).length };
  });
  const statusCount = (status: string) => statusCounts.find((entry) => entry.status === status)?._count._all ?? 0;
  const pendingReviews = statusCount("SUBMITTED");
  const approvedReports = statusCount("APPROVED");
  const rejectedReports = statusCount("REJECTED");
  const draftReports = statusCount("DRAFT");
  const teamStatus = team.map(({ reports: [latest], ...user }) => {
    const currentWeek = latest && latest.workDate >= weekStart;
    const completeness = latest ? [latest.completedTasks, latest.ongoingTasks, latest.blockers, latest.nextSteps].filter((value) => value.trim().length > 0).length * 25 : null;
    return { ...user, latestReport: latest ?? null, weekStatus: currentWeek ? latest.status : "MISSING", completeness };
  });
  return Response.json({ reports, users: team.map(({ id, name, designation, email }) => ({ id, name, designation, email })), summary: { activeUsers, submittedToday, pendingReviews, approvedReports, rejectedReports, draftReports, weeklyCount, monthlyCount, dailyTrend, teamStatus } });
});
