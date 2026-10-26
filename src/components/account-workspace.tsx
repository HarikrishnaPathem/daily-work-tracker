"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useWorkspaceUser } from "@/components/dashboard-shell";
import { apiFetch } from "@/lib/client-api";

export function AccountWorkspace() {
  const user = useWorkspaceUser();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [designation, setDesignation] = useState(user.designation);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setSavingProfile(true); setError(""); setNotice("");
    try { await apiFetch("/api/account", { method: "PATCH", body: JSON.stringify({ name, designation }) }); setNotice("Your profile has been updated."); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update your profile."); }
    finally { setSavingProfile(false); }
  }
  async function changePassword(event: FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    if (newPassword === currentPassword) { setError("Choose a new password different from your current one."); return; }
    setSavingPassword(true);
    try { await apiFetch("/api/account/password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }); router.replace("/login?password=changed"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not change your password."); }
    finally { setSavingPassword(false); }
  }

  return <div className="dashboard-stack"><section className="page-intro"><div><span className="eyebrow">PERSONAL SETTINGS</span><h2>Manage account</h2><p>Keep your profile details current and protect your account.</p></div></section>{error && <div className="form-error page-error" role="alert"><Icon name="alert" size={16}/>{error}</div>}{notice && <div className="toast-success" role="status"><Icon name="check" size={17}/>{notice}</div>}
    <div className="account-layout"><section className="card account-profile-card"><div className="settings-heading"><span className="large-avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><span className="eyebrow">ACCOUNT PROFILE</span><h3>{user.name}</h3><span className="role-pill">{user.role === "HEAD" ? "Workspace HEAD" : "Team member"}</span></div></div><div className="account-readonly"><div><span>Email address</span><b>{user.email}</b><small>Email is managed by your workspace HEAD.</small></div><div><span>Account role</span><b>{user.role}</b><small>Roles are assigned by the workspace.</small></div></div><form className="stack-form profile-form" onSubmit={saveProfile}><label>Full name<input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}/></label><label>Designation<input required maxLength={100} value={designation} onChange={(e) => setDesignation(e.target.value)}/></label><button className="button primary" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</button></form></section>
    <section className="card password-card"><div className="password-heading"><span className="password-icon"><Icon name="key" size={20}/></span><div><span className="eyebrow">SECURITY</span><h3>Change password</h3></div></div><p className="muted">Use at least 12 characters. Changing your password signs out all active sessions.</p><form className="stack-form" onSubmit={changePassword}><label>Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}/></label><label>New password<input required type="password" minLength={12} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}/></label><label>Confirm new password<input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/></label><button className="button secondary" disabled={savingPassword}>{savingPassword ? "Changing password…" : "Update password"}</button></form></section></div>
    <div className="security-note"><Icon name="check" size={17}/><span>Your account is protected by a private, server-side session. Passwords are never shown in this workspace.</span></div></div>;
}
