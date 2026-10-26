"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { useWorkspaceUser } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/client-api";

type Status = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
type Review = { id: string; decision: string; comment: string | null; createdAt: string; reviewer?: { name: string } };
type Report = { id: string; userId: string; workDate: string; completedTasks: string; ongoingTasks: string; blockers: string; nextSteps: string; status: Status; reviewerComment: string | null; submittedAt: string | null; reviewedAt: string | null; user?: { id: string; name: string; email: string; designation?: string }; reviews?: Review[] };
type Draft = Pick<Report, "workDate" | "completedTasks" | "ongoingTasks" | "blockers" | "nextSteps">;
const empty = (date = new Date().toISOString().slice(0, 10)): Draft => ({ workDate: date, completedTasks: "", ongoingTasks: "", blockers: "", nextSteps: "" });
const statusText: Record<string, string> = { DRAFT: "Draft", SUBMITTED: "In review", APPROVED: "Approved", REJECTED: "Needs revision" };

function Badge({ status }: { status: string }) { return <span className={`status-badge status-${status.toLowerCase()}`}><i/>{statusText[status] ?? status}</span>; }
function LoadingRows() { return <div className="loading-list">{[1, 2, 3, 4].map((i) => <div className="skeleton report-row-skeleton" key={i}/>)}</div>; }

export function ReportsWorkspace() {
  const user = useWorkspaceUser();
  const router = useRouter();
  const params = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState(params.get("userId") ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty(params.get("date") ?? undefined));
  const [reviewComment, setReviewComment] = useState("");
  const [reviewDecision, setReviewDecision] = useState<"APPROVED" | "REJECTED" | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (user.role === "HEAD") {
        const [reportData, accountData] = await Promise.all([apiFetch<{ reports: Report[] }>("/api/updates"), apiFetch<{ users: { id: string; name: string }[] }>("/api/users")]);
        setReports(reportData.reports); setUsers(accountData.users);
      } else {
        const data = await apiFetch<{ reports: Report[] }>("/api/updates"); setReports(data.reports);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load reports."); }
    finally { setLoading(false); }
  }, [user.role]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const reportId = params.get("report");
    if (loading) return;
    if (reportId) { setSelected(reports.find((report) => report.id === reportId) ?? null); return; }
    const requestedDate = params.get("date");
    if (requestedDate) {
      const existing = reports.find((report) => report.workDate.slice(0, 10) === requestedDate);
      if (existing?.status !== "APPROVED") { setSelected(existing ?? null); setDraft(existing ? { workDate: existing.workDate.slice(0, 10), completedTasks: existing.completedTasks, ongoingTasks: existing.ongoingTasks, blockers: existing.blockers, nextSteps: existing.nextSteps } : empty(requestedDate)); setEditing(true); }
      else setSelected(existing);
    }
  }, [params, reports, loading]);

  const filteredReports = useMemo(() => reports.filter((report) => {
    const name = report.user?.name ?? "";
    const contents = [name, report.completedTasks, report.ongoingTasks, report.blockers, report.nextSteps].join(" ").toLowerCase();
    const day = report.workDate.slice(0, 10);
    return (!query || contents.includes(query.toLowerCase())) && (statusFilter === "ALL" || report.status === statusFilter) && (!userFilter || report.userId === userFilter) && (!from || day >= from) && (!to || day <= to);
  }), [reports, query, statusFilter, userFilter, from, to]);

  function open(report: Report) { setSelected(report); setEditing(false); setError(""); setReviewDecision(null); router.replace(`/reports?report=${report.id}`, { scroll: false }); }
  function close() { setSelected(null); setEditing(false); setReviewDecision(null); router.replace("/reports", { scroll: false }); }
  function startCreate() { setSelected(null); setEditing(true); setDraft(empty(params.get("date") ?? undefined)); setError(""); setNotice(""); }
  function startEdit(report: Report) { setSelected(report); setEditing(true); setDraft({ workDate: report.workDate.slice(0, 10), completedTasks: report.completedTasks, ongoingTasks: report.ongoingTasks, blockers: report.blockers, nextSteps: report.nextSteps }); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const nextStatus = submitter?.value === "SUBMITTED" ? "SUBMITTED" : "DRAFT";
    if (nextStatus === "SUBMITTED" && !window.confirm("Submit this report for HEAD review? You can still edit it until it is approved.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const path = selected ? `/api/updates/${selected.id}` : "/api/updates";
      const response = await apiFetch<{ report: Report }>(path, { method: selected ? "PATCH" : "POST", body: JSON.stringify({ ...draft, status: nextStatus }) });
      const previous = reports.find((report) => report.id === response.report.id);
      const saved = { ...previous, ...response.report, user: response.report.user ?? previous?.user, reviews: previous?.reviews ?? [] };
      setReports((current) => [...current.filter((report) => report.id !== saved.id), saved].sort((a, b) => b.workDate.localeCompare(a.workDate)));
      setSelected(saved); setEditing(false); setNotice(nextStatus === "SUBMITTED" ? "Report submitted for review." : "Draft saved."); router.replace(`/reports?report=${response.report.id}`, { scroll: false });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your report."); }
    finally { setBusy(false); }
  }

  async function submitReview() {
    if (!selected || !reviewDecision) return;
    if (reviewDecision === "REJECTED" && !reviewComment.trim()) { setError("Please add a comment explaining the requested changes."); return; }
    setBusy(true); setError("");
    try {
      const result = await apiFetch<{ report: Report; review: Review }>(`/api/updates/${selected.id}/review`, { method: "POST", body: JSON.stringify({ decision: reviewDecision, comment: reviewComment }) });
      const reviewed = { ...selected, ...result.report, reviews: [result.review, ...(selected.reviews ?? [])] };
      setReports((current) => current.map((report) => report.id === reviewed.id ? { ...report, ...reviewed } : report));
      setSelected(reviewed); setNotice(reviewDecision === "APPROVED" ? "Report approved." : "Report returned for revision."); setReviewDecision(null); setReviewComment("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review could not be saved."); }
    finally { setBusy(false); }
  }

  const counts = { total: reports.length, pending: reports.filter((report) => report.status === "SUBMITTED").length };
  return <div className="dashboard-stack"><section className="page-intro"><div><span className="eyebrow">DAILY UPDATES</span><h2>{user.role === "HEAD" ? "Review team reports" : "Your reports"}</h2><p>{user.role === "HEAD" ? "Find, open, and review submitted work updates." : "Create, update, and revisit your daily work history."}</p></div>{user.role === "USER" && <button className="button primary" onClick={startCreate}><Icon name="plus"/>New report</button>}</section>
    <div className="inline-metrics"><div><span className="inline-metric-icon"><Icon name="reports"/></span><span><small>Total reports</small><b>{counts.total}</b></span></div>{user.role === "HEAD" && <div><span className="inline-metric-icon amber-icon"><Icon name="clock"/></span><span><small>Awaiting review</small><b>{counts.pending}</b></span></div>}<span className="muted inline-note">{user.role === "USER" ? "Approved reports are locked. Rejected reports can be revised and resubmitted." : "Only submitted reports can be approved or returned."}</span></div>
    <section className="card reports-card"><div className="filter-bar"><label className="search-field"><Icon name="search" size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports or tasks" aria-label="Search reports"/></label>{user.role === "HEAD" && <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} aria-label="Filter by user"><option value="">All team members</option>{users.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select>}<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status"><option value="ALL">All statuses</option>{(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"] as const).map((status) => <option value={status} key={status}>{statusText[status]}</option>)}</select><label className="date-filter"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date"/></label><label className="date-filter"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date"/></label></div>
      {error && !selected && <div className="form-error page-error" role="alert"><Icon name="alert" size={16}/>{error}<button className="text-button" onClick={() => void load()}>Retry</button></div>}{loading ? <LoadingRows/> : filteredReports.length === 0 ? <div className="empty-card"><span className="empty-mark"><Icon name="filter" size={21}/></span><b>{reports.length ? "No reports match these filters" : "Nothing here yet"}</b><span>{reports.length ? "Try a different search or clear one of the filters." : user.role === "HEAD" ? "Team submissions will appear here." : "Create your first daily update to get started."}</span>{user.role === "USER" && !reports.length && <button className="button primary" onClick={startCreate}><Icon name="plus"/>Create a report</button>}</div> : <div className="table-scroll"><table className="data-table reports-table"><thead><tr>{user.role === "HEAD" && <th>Team member</th>}<th>Work date</th><th>Summary</th><th>Status</th><th>Submitted</th><th/></tr></thead><tbody>{filteredReports.map((report) => <tr key={report.id}>{user.role === "HEAD" && <td><span className="table-person"><span className="small-avatar">{report.user?.name.slice(0, 1)}</span><span><b>{report.user?.name}</b><small>{report.user?.designation}</small></span></span></td>}<td>{new Date(`${report.workDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</td><td className="summary-cell">{report.completedTasks || report.ongoingTasks || "No task summary"}</td><td><Badge status={report.status}/></td><td>{report.submittedAt ? new Date(report.submittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : <span className="muted">Not submitted</span>}</td><td><button className="table-action" onClick={() => open(report)}>{user.role === "HEAD" && report.status === "SUBMITTED" ? "Review" : "View"}<Icon name="arrow" size={14}/></button></td></tr>)}</tbody></table></div>}
    </section>
    {notice && <div className="toast-success" role="status"><Icon name="check" size={17}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {editing && user.role === "USER" && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setEditing(false); setSelected(null); } }}><section className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-modal-title"><div className="modal-header"><div><span className="eyebrow">DAILY UPDATE</span><h3 id="report-modal-title">{selected ? "Edit report" : "Create a report"}</h3></div><button className="icon-button" onClick={() => { setEditing(false); setSelected(null); }} aria-label="Close"><Icon name="close"/></button></div>{error && <div className="form-error" role="alert"><Icon name="alert" size={16}/>{error}</div>}<form className="report-form" onSubmit={save}><label className="full-span">Work date<input type="date" required value={draft.workDate} onChange={(e) => setDraft({ ...draft, workDate: e.target.value })} disabled={Boolean(selected && selected.status === "APPROVED")}/></label><label>Completed tasks<textarea rows={4} maxLength={10000} value={draft.completedTasks} onChange={(e) => setDraft({ ...draft, completedTasks: e.target.value })} placeholder="What did you finish today?"/></label><label>Ongoing tasks<textarea rows={4} maxLength={10000} value={draft.ongoingTasks} onChange={(e) => setDraft({ ...draft, ongoingTasks: e.target.value })} placeholder="What are you working on?"/></label><label>Blockers<textarea rows={3} maxLength={10000} value={draft.blockers} onChange={(e) => setDraft({ ...draft, blockers: e.target.value })} placeholder="Anything slowing you down?"/></label><label>Next steps<textarea rows={3} maxLength={10000} value={draft.nextSteps} onChange={(e) => setDraft({ ...draft, nextSteps: e.target.value })} placeholder="What’s next?"/></label><div className="modal-actions full-span"><button type="button" className="button ghost" onClick={() => { setEditing(false); setSelected(null); }}>Cancel</button><button className="button secondary" value="DRAFT" disabled={busy}>{busy ? "Saving…" : "Save draft"}</button><button className="button primary" value="SUBMITTED" disabled={busy}>{busy ? "Saving…" : "Submit report"}</button></div></form></section></div>}
    {selected && !editing && <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}><section className="modal detail-modal" role="dialog" aria-modal="true" aria-labelledby="report-detail-title"><div className="modal-header"><div><span className="eyebrow">{selected.user?.name ?? "YOUR REPORT"} · {new Date(`${selected.workDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span><h3 id="report-detail-title">Daily work update</h3></div><div className="modal-head-actions"><Badge status={selected.status}/><button className="icon-button" onClick={close} aria-label="Close report"><Icon name="close"/></button></div></div>{error && <div className="form-error" role="alert"><Icon name="alert" size={16}/>{error}</div>}<div className="detail-grid">{([["Completed tasks", selected.completedTasks], ["Ongoing tasks", selected.ongoingTasks], ["Blockers", selected.blockers], ["Next steps", selected.nextSteps]] as const).map(([label, value]) => <article key={label}><span>{label}</span><p>{value || "No details provided."}</p></article>)}</div>{selected.reviewerComment && <div className="review-feedback"><span className="eyebrow">LATEST REVIEW COMMENT</span><p>{selected.reviewerComment}</p></div>}{selected.reviews?.length ? <div className="review-history"><h4>Review history</h4>{selected.reviews.map((review) => <div className="review-entry" key={review.id}><span className="review-entry-icon"><Icon name={review.decision === "APPROVED" ? "check" : "alert"} size={15}/></span><div><b>{review.reviewer?.name ?? "HEAD"} {review.decision === "APPROVED" ? "approved" : "requested changes"}</b><small>{new Date(review.createdAt).toLocaleString()}</small>{review.comment && <p>{review.comment}</p>}</div></div>)}</div> : null}{user.role === "HEAD" && selected.status === "SUBMITTED" && <div className="review-actions"><button className="button primary" onClick={() => { setReviewDecision("APPROVED"); setReviewComment(""); }}><Icon name="check"/>Approve</button><button className="button reject-button" onClick={() => { setReviewDecision("REJECTED"); setReviewComment(""); }}><Icon name="alert"/>Request revision</button></div>}{user.role === "USER" && selected.status !== "APPROVED" && <div className="review-actions"><button className="button primary" onClick={() => startEdit(selected)}><Icon name="reports"/>Edit report</button></div>}</section></div>}
    {reviewDecision && selected && <div className="modal-backdrop nested-backdrop"><section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-header"><div><span className="eyebrow">REPORT REVIEW</span><h3 id="review-title">{reviewDecision === "APPROVED" ? "Approve this report?" : "Request a revision"}</h3></div><button className="icon-button" onClick={() => setReviewDecision(null)} aria-label="Close"><Icon name="close"/></button></div><p className="muted">{reviewDecision === "APPROVED" ? "The author will no longer be able to edit this report." : "Add a note to help the author understand what to update."}</p>{reviewDecision === "REJECTED" && <label>Comment<textarea rows={4} maxLength={4000} required value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share the changes needed…" autoFocus/></label>}{error && <div className="form-error" role="alert">{error}</div>}<div className="modal-actions"><button className="button ghost" onClick={() => setReviewDecision(null)}>Cancel</button><button className={`button ${reviewDecision === "APPROVED" ? "primary" : "reject-button"}`} disabled={busy || (reviewDecision === "REJECTED" && !reviewComment.trim())} onClick={() => void submitReview()}>{busy ? "Saving…" : reviewDecision === "APPROVED" ? "Approve report" : "Send revision request"}</button></div></section></div>}
  </div>;
}
