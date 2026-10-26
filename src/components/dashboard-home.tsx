"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { useWorkspaceUser } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/client-api";

type Status = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
type Report = { id: string; workDate: string; status: Status; submittedAt: string | null; reviewerComment: string | null; completedTasks: string; ongoingTasks: string; blockers: string; nextSteps: string; user?: { id: string; name: string; designation: string } };
type Trend = { date: string; count: number };
type HeadData = { reports: Report[]; summary: { activeUsers: number; submittedToday: number; pendingReviews: number; approvedReports: number; rejectedReports: number; draftReports: number; weeklyCount: number; monthlyCount: number; dailyTrend: Trend[]; teamStatus: { id: string; name: string; designation: string; weekStatus: Status | "MISSING"; completeness: number | null; latestReport: Report | null }[] } };
type UserData = { reports: Report[]; todayReport: Report | null; counts: Record<string, number>; summary: { submitted: number; pendingReviews: number; approved: number; rejected: number; dailyTrend: Trend[] } };

function TrendChart({ data, title }: { data: Trend[]; title: string }) {
  const max = Math.max(1, ...data.map((day) => day.count));
  const points = data.map((item, i) => `${16 + i * (268 / Math.max(1, data.length - 1))},${90 - item.count / max * 66}`).join(" ");
  return <section className="card chart-card"><div className="card-heading"><div><span className="eyebrow">ACTIVITY</span><h3>{title}</h3></div><span className="chart-legend"><i/>Submissions</span></div>{data.every((day) => day.count === 0) ? <div className="chart-empty"><Icon name="trend"/><span>No submissions in this period</span></div> : <><div className="line-chart"><svg viewBox="0 0 300 112" role="img" aria-label={`${title} line chart`}><path d="M16 90H284M16 57H284M16 24H284" className="chart-grid"/><polyline points={points} className="chart-line"/>{data.map((item, i) => <circle key={item.date} cx={16 + i * (268 / Math.max(1, data.length - 1))} cy={90 - item.count / max * 66} r="3.5" className="chart-point"><title>{item.date}: {item.count} submissions</title></circle>)}</svg></div><div className="chart-labels">{data.map((day) => <span key={day.date}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>)}</div></>}</section>;
}

function StatusChart({ counts }: { counts: { label: string; count: number; color: string }[] }) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  let cursor = 0;
  const segments = counts.map((item) => { const start = cursor; cursor += total ? item.count / total * 100 : 0; return { ...item, start, length: total ? item.count / total * 100 : 0 }; });
  return <section className="card chart-card"><div className="card-heading"><div><span className="eyebrow">REPORTS</span><h3>Current report status</h3></div></div>{total === 0 ? <div className="chart-empty"><Icon name="reports"/><span>No reports to summarize yet</span></div> : <div className="status-chart-wrap"><div className="donut" role="img" aria-label="Report status breakdown"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="45" className="donut-track"/>{segments.map((segment) => <circle key={segment.label} cx="60" cy="60" r="45" className="donut-segment" stroke={segment.color} strokeDasharray={`${segment.length * 2.827} 282.7`} strokeDashoffset={-segment.start * 2.827}/>)}</svg><div className="donut-center"><b>{total}</b><small>reports</small></div></div><div className="donut-legend">{counts.map((item) => <div key={item.label}><i style={{ background: item.color }}/><span>{item.label}</span><b>{item.count}</b></div>)}</div></div>}</section>;
}

function Metric({ label, value, icon, note, tone = "rose" }: { label: string; value: number; icon: "users" | "reports" | "clock" | "check" | "alert"; note: string; tone?: string }) {
  return <article className="metric-card"><span className={`metric-icon tone-${tone}`}><Icon name={icon}/></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase()}`}><i/>{status.replaceAll("_", " ").toLowerCase()}</span>; }
function LatestTable({ reports, head = false }: { reports: Report[]; head?: boolean }) {
  if (!reports.length) return <div className="empty-card"><span className="empty-mark"><Icon name="reports" size={22}/></span><b>No reports yet</b><span>When your team starts sharing updates, they’ll show up here.</span></div>;
  return <div className="table-scroll"><table className="data-table"><thead><tr>{head && <th>Team member</th>}<th>Work date</th><th>Status</th><th>Submitted</th>{head && <th>Review</th>}</tr></thead><tbody>{reports.slice(0, 6).map((report) => <tr key={report.id}>{head && <td><span className="table-person"><span className="small-avatar">{report.user?.name.slice(0, 1)}</span><span><b>{report.user?.name}</b><small>{report.user?.designation}</small></span></span></td>}<td>{new Date(`${report.workDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td><td><StatusBadge status={report.status}/></td><td>{report.submittedAt ? new Date(report.submittedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : <span className="muted">—</span>}</td>{head && <td><Link href={`/reports?report=${report.id}`} className="table-action">{report.status === "SUBMITTED" ? "Review" : "Open"}<Icon name="arrow" size={14}/></Link></td>}</tr>)}</tbody></table></div>;
}

export function DashboardHome() {
  const user = useWorkspaceUser();
  const [headData, setHeadData] = useState<HeadData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (user.role === "HEAD") setHeadData(await apiFetch<HeadData>("/api/dashboard/head"));
      else setUserData(await apiFetch<UserData>("/api/dashboard/user"));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load dashboard data"); }
    finally { setLoading(false); }
  }, [user.role]);
  useEffect(() => { void load(); }, [load, retryKey]);
  const todaysDate = new Date().toISOString().slice(0, 10);

  if (loading) return <div className="dashboard-stack"><div className="skeleton skeleton-welcome"/><div className="metric-grid">{Array.from({ length: user.role === "HEAD" ? 5 : 4 }, (_, i) => <div className="skeleton metric-skeleton" key={i}/>)}</div><div className="chart-grid"><div className="skeleton chart-skeleton"/><div className="skeleton chart-skeleton"/></div></div>;
  if (error) return <div className="error-panel" role="alert"><Icon name="alert"/><div><b>We couldn’t load your dashboard</b><p>{error}</p><button className="button secondary" onClick={() => setRetryKey((value) => value + 1)}>Try again</button></div></div>;

  if (user.role === "HEAD" && headData) {
    const { summary } = headData;
    return <div className="dashboard-stack"><section className="welcome-row"><div><span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</span><h2>Good day, {user.name.split(" ")[0]} <span className="wave">✦</span></h2><p>Here’s the latest from your team. Small steps add up.</p></div><div className="welcome-actions"><Link className="button primary" href="/reports"><Icon name="reports"/>Review reports <span className="button-count">{summary.pendingReviews}</span></Link><Link className="button ghost" href="/users"><Icon name="users"/>Manage users</Link></div></section>
      <div className="metric-grid"><Metric label="Active team members" value={summary.activeUsers} icon="users" note="Active USER accounts" tone="rose"/><Metric label="Submitted today" value={summary.submittedToday} icon="reports" note="Reports sent for review" tone="blue"/><Metric label="Pending reviews" value={summary.pendingReviews} icon="clock" note="Ready for your attention" tone="amber"/><Metric label="Approved reports" value={summary.approvedReports} icon="check" note="All-time total" tone="green"/><Metric label="Needs revision" value={summary.rejectedReports} icon="alert" note="Reports returned to authors" tone="gray"/></div>
      <div className="chart-grid"><TrendChart data={summary.dailyTrend} title="Team submission trend · 7 days"/><StatusChart counts={[{ label: "Pending review", count: summary.pendingReviews, color: "#A92427" }, { label: "Drafts", count: summary.draftReports, color: "#e8bbc0" }, { label: "Approved", count: summary.approvedReports, color: "#428d72" }, { label: "Needs revision", count: summary.rejectedReports, color: "#e0a04b" }]}/></div>
      <section className="card team-card"><div className="section-title"><div><span className="eyebrow">YOUR PEOPLE</span><h3>Team overview</h3></div><span className="section-subtitle">{summary.weeklyCount} submitted this week · {summary.monthlyCount} this month</span></div>{summary.teamStatus.length ? <div className="team-grid">{summary.teamStatus.map((member) => <article className="team-member" key={member.id}><div className="team-member-top"><span className="member-avatar">{member.name.split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase()}</span><StatusBadge status={member.weekStatus === "MISSING" ? "MISSING" : member.weekStatus}/></div><b>{member.name}</b><span className="member-role">{member.designation}</span>{member.latestReport ? <><div className="progress-label"><span>Latest update completeness</span><b>{member.completeness}%</b></div><div className="progress-track"><span style={{ width: `${member.completeness}%` }}/></div><small className="member-date">Latest: {new Date(`${member.latestReport.workDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {member.latestReport.status.toLowerCase()}</small></> : <p className="member-empty">No report submitted yet</p>}<Link href={`/reports?userId=${member.id}`} className="member-link">View reports <Icon name="arrow" size={14}/></Link></article>)}</div> : <div className="empty-card compact"><b>No team members yet</b><span>Create a user account to start collecting updates.</span><Link className="button primary" href="/users">Add a teammate</Link></div>}</section>
      <section className="card"><div className="section-title"><div><span className="eyebrow">LATEST ACTIVITY</span><h3>Recent reports</h3></div><Link className="text-link" href="/reports">View all <Icon name="arrow" size={15}/></Link></div><LatestTable reports={headData.reports} head/></section></div>;
  }
  if (!userData) return null;
  const today = userData.todayReport;
  return <div className="dashboard-stack"><section className="welcome-row"><div><span className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</span><h2>Welcome back, {user.name.split(" ")[0]} <span className="wave">✦</span></h2><p>Your steady updates help everyone stay in sync.</p></div><Link className="button primary" href={`/reports?date=${todaysDate}`}><Icon name="plus"/> {today ? "Continue today’s report" : "Create today’s report"}<Icon name="arrow" size={16}/></Link></section>
    {!today ? <div className="reminder-card"><span className="reminder-icon"><Icon name="calendar"/></span><div><b>Today’s update is still waiting</b><p>Add a quick update on what you’ve completed, what’s in progress, and what comes next.</p></div><Link className="text-link" href={`/reports?date=${todaysDate}`}>Create report <Icon name="arrow" size={15}/></Link></div> : today.status === "REJECTED" ? <div className="reminder-card revision-card"><span className="reminder-icon"><Icon name="alert"/></span><div><b>Your update needs a revision</b><p>{today.reviewerComment || "Review your report and resubmit when ready."}</p></div><Link className="text-link" href={`/reports?report=${today.id}`}>Revise report <Icon name="arrow" size={15}/></Link></div> : <div className="today-card"><div><span className="eyebrow">TODAY’S REPORT</span><h3>{today.status === "DRAFT" ? "Draft saved" : today.status === "APPROVED" ? "Approved and complete" : "Submitted for review"}</h3><p>{today.reviewerComment || (today.status === "DRAFT" ? "Continue your draft and submit it when it’s ready." : "Your latest report is up to date.")}</p></div><StatusBadge status={today.status}/></div>}
    <div className="metric-grid four"><Metric label="Reports submitted" value={userData.summary.submitted} icon="reports" note="All-time total" tone="rose"/><Metric label="Approved" value={userData.summary.approved} icon="check" note="Reports reviewed" tone="green"/><Metric label="Pending review" value={userData.summary.pendingReviews} icon="clock" note="Waiting for HEAD" tone="amber"/><Metric label="Needs revision" value={userData.summary.rejected} icon="alert" note="Ready for your update" tone="gray"/></div>
    <div className="chart-grid personal-charts"><TrendChart data={userData.summary.dailyTrend} title="Your submissions · last 7 days"/><section className="card progress-card"><div><span className="eyebrow">RECENT PACE</span><h3>Days with submissions</h3><p>Based on reports submitted in the last 7 days.</p></div><div className="week-bars">{userData.summary.dailyTrend.map((day) => <div key={day.date}><span className={day.count ? "day-bar day-filled" : "day-bar"} title={`${day.count} submitted report(s)`}/><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</small></div>)}</div><div className="week-total"><b>{userData.summary.dailyTrend.filter((day) => day.count > 0).length} of 7</b><span>days with a submission</span></div></section></div>
    <section className="card"><div className="section-title"><div><span className="eyebrow">YOUR WORK</span><h3>Recent reports</h3></div><Link className="text-link" href="/reports">See all reports <Icon name="arrow" size={15}/></Link></div><LatestTable reports={userData.reports}/></section></div>;
}
