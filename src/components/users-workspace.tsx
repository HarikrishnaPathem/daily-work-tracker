"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { apiFetch } from "@/lib/client-api";
import { useWorkspaceUser } from "@/components/dashboard-shell";

type Account = { id: string; name: string; designation: string; email: string; role: "USER" | "HEAD"; active: boolean; createdAt: string; _count: { reports: number } };
type UserForm = { name: string; designation: string; email: string; password: string; role: "USER" | "HEAD" };
const empty: UserForm = { name: "", designation: "", email: "", password: "", role: "USER" };

export function UsersWorkspace() {
  const currentUser = useWorkspaceUser();
  const [users, setUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<UserForm>(empty);
  const [passwordTarget, setPasswordTarget] = useState<Account | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const formOpen = editing !== null || creating;

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const data = await apiFetch<{ users: Account[] }>("/api/users"); setUsers(data.users); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load user accounts."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function openCreate() { setEditing(null); setForm(empty); setCreating(true); setError(""); }
  function openEdit(account: Account) { setEditing(account); setCreating(false); setForm({ name: account.name, designation: account.designation, email: account.email, password: "", role: account.role }); setError(""); }
  function closeForm() { setCreating(false); setEditing(null); setForm(empty); setError(""); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      if (editing) {
        const { user: updated } = await apiFetch<{ user: Account }>(`/api/users/${editing.id}`, { method: "PATCH", body: JSON.stringify({ name: form.name, designation: form.designation, email: form.email }) });
        setUsers((current) => current.map((account) => account.id === updated.id ? updated : account).sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const { user: created } = await apiFetch<{ user: Account }>("/api/users", { method: "POST", body: JSON.stringify(form) });
        setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setNotice(editing ? "Account details updated." : `${form.role === "HEAD" ? "HEAD" : "USER"} account created.`); closeForm();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save account."); }
    finally { setBusy(false); }
  }
  async function toggle(account: Account) {
    const action = account.active ? "deactivate" : "reactivate";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${account.name}’s account?${account.active ? " Their active sessions will end." : " This account will be able to sign in again."}`)) return;
    setBusy(true); setError("");
    try { const { user: updated } = await apiFetch<{ user: Account }>(`/api/users/${account.id}`, { method: "PATCH", body: JSON.stringify({ active: !account.active }) }); setUsers((current) => current.map((item) => item.id === updated.id ? updated : item)); setNotice(`Account ${account.active ? "deactivated" : "reactivated"}.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update account."); }
    finally { setBusy(false); }
  }
  async function resetPassword(event: FormEvent) {
    event.preventDefault(); if (!passwordTarget) return;
    setBusy(true); setError("");
    try { await apiFetch(`/api/users/${passwordTarget.id}/password`, { method: "POST", body: JSON.stringify({ password: newPassword }) }); setNotice(`Password reset for ${passwordTarget.name}; their sessions have been revoked.`); setPasswordTarget(null); setNewPassword(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reset password."); }
    finally { setBusy(false); }
  }

  return <div className="dashboard-stack"><section className="page-intro"><div><span className="eyebrow">TEAM ACCESS</span><h2>Manage your team</h2><p>Create accounts, update team details, and manage access.</p></div><button className="button primary" onClick={openCreate}><Icon name="plus"/>Add account</button></section>
    {error && !formOpen && <div className="form-error page-error" role="alert"><Icon name="alert" size={16}/>{error}<button className="text-button" onClick={() => void load()}>Retry</button></div>}{notice && <div className="toast-success" role="status"><Icon name="check" size={17}/>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
    {loading ? <div className="user-card-grid">{[1, 2, 3].map((i) => <div className="skeleton user-skeleton" key={i}/>)}</div> : users.length ? <div className="user-card-grid">{users.map((account) => <article className={`card account-card ${!account.active ? "account-inactive" : ""}`} key={account.id}><div className="account-card-top"><span className="member-avatar">{account.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className={`account-state ${account.active ? "active" : "inactive"}`}><i/>{account.active ? "Active" : "Inactive"}</span><div className="account-actions"><button className="icon-button small" onClick={() => openEdit(account)} aria-label={`Edit ${account.name}`} title="Edit details"><Icon name="settings" size={16}/></button><button className="icon-button small" onClick={() => { setPasswordTarget(account); setNewPassword(""); setError(""); }} aria-label={`Reset ${account.name} password`} title="Reset password"><Icon name="key" size={16}/></button></div></div><h3>{account.name}</h3><span className={`role-pill account-role ${account.role === "HEAD" ? "head-role" : ""}`}>{account.role}</span><p className="account-designation">{account.designation}</p><a className="account-email" href={`mailto:${account.email}`}>{account.email}</a><div className="account-stats"><span><b>{account._count.reports}</b><small>reports</small></span><span><b>{new Date(account.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</b><small>joined</small></span></div>{account.id !== currentUser.id && <button className={`button ${account.active ? "outline-danger" : "outline"} account-toggle`} onClick={() => void toggle(account)} disabled={busy}>{account.active ? "Deactivate account" : "Reactivate account"}</button>}</article>)}</div> : <div className="empty-card"><span className="empty-mark"><Icon name="users" size={22}/></span><b>No accounts added yet</b><span>Create an account and choose whether it has HEAD or USER access.</span><button className="button primary" onClick={openCreate}><Icon name="plus"/>Add account</button></div>}
    {formOpen && <div className="modal-backdrop"><section className="modal account-modal" role="dialog" aria-modal="true" aria-labelledby="user-form-title"><div className="modal-header"><div><span className="eyebrow">TEAM ACCOUNT</span><h3 id="user-form-title">{editing ? "Edit account details" : "Create an account"}</h3></div><button className="icon-button" onClick={closeForm} aria-label="Close"><Icon name="close"/></button></div><p className="muted">Accounts can sign in after you share their email and initial password with them.</p>{error && <div className="form-error" role="alert"><Icon name="alert" size={16}/>{error}</div>}<form className="stack-form" onSubmit={save}><label>Full name<input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label><label>Designation<input required maxLength={100} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Product designer"/></label><label>Email address<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>{!editing && <><label>Account role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "USER" | "HEAD" })}><option value="USER">USER</option><option value="HEAD">HEAD</option></select></label><label>Initial password<input required type="password" minLength={12} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/><small className="field-note">Use at least 12 characters. Passwords are stored as one-way hashes.</small></label></> }<div className="modal-actions"><button type="button" className="button ghost" onClick={closeForm}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create account"}</button></div></form></section></div>}
    {passwordTarget && <div className="modal-backdrop"><section className="modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="password-title"><div className="modal-header"><div><span className="eyebrow">PASSWORD RESET</span><h3 id="password-title">Set a new password</h3></div><button className="icon-button" onClick={() => setPasswordTarget(null)} aria-label="Close"><Icon name="close"/></button></div><p className="muted">Resetting <b>{passwordTarget.name}</b>’s password ends their current sessions.</p>{error && <div className="form-error" role="alert">{error}</div>}<form className="stack-form" onSubmit={resetPassword}><label>New password<input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/></label><div className="modal-actions"><button type="button" className="button ghost" onClick={() => setPasswordTarget(null)}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button></div></form></section></div>}
  </div>;
}
