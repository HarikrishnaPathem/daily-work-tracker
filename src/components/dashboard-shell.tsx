"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createContext, useContext } from "react";
import { Icon } from "@/components/icon";
import { formatWorkspaceDate } from "@/lib/workspace-date.mjs";
import { timedFetch } from "@/lib/client-api";

export type SafeUser = { id: string; name: string; email: string; designation: string; role: "HEAD" | "USER" };
const WorkspaceUserContext = createContext<SafeUser | null>(null);
export function useWorkspaceUser() { const user = useContext(WorkspaceUserContext); if (!user) throw new Error("Workspace user context is missing"); return user; }
const allNav = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" as const },
  { href: "/reports", label: "Reports", icon: "reports" as const },
  { href: "/users", label: "Users", icon: "users" as const, head: true },
  { href: "/manage-account", label: "Manage Account", icon: "settings" as const },
];
const titles: Record<string, string> = { "/dashboard": "Dashboard", "/reports": "Reports", "/users": "Users", "/manage-account": "Manage Account" };

export function DashboardShell({ user, children, initialNow }: { user: SafeUser; children: React.ReactNode; initialNow: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [todayLabel, setTodayLabel] = useState(() => formatWorkspaceDate(initialNow, "UTC"));
  const nav = allNav.filter((item) => !item.head || user.role === "HEAD");

  useEffect(() => {
    let midnightTimer: number | undefined;
    const updateLocalDate = () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      const now = new Date();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      setTodayLabel(formatWorkspaceDate(now, timeZone));
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      midnightTimer = window.setTimeout(updateLocalDate, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    };
    updateLocalDate();
    window.addEventListener("focus", updateLocalDate);
    return () => {
      if (midnightTimer !== undefined) window.clearTimeout(midnightTimer);
      window.removeEventListener("focus", updateLocalDate);
    };
  }, []);

  async function logout() {
    try { await timedFetch("/api/auth/logout", { method: "POST" }); }
    finally { router.replace("/login"); }
  }

  return <div className="workspace">
    {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
      <Link className="brand" href="/dashboard" onClick={() => setMenuOpen(false)}><span className="brand-mark"><Image src="/logo-sm.png" alt="" width={40} height={40} priority /></span><span><b>Daily Work</b><small>Update tracker</small></span></Link>
      <div className="nav-label">WORKSPACE</div>
      <nav className="side-nav" aria-label="Main navigation">{nav.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`nav-link ${pathname === item.href ? "nav-active" : ""}`} aria-current={pathname === item.href ? "page" : undefined}><Icon name={item.icon} size={18} /><span>{item.label}</span></Link>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-note"><span className="online-dot"/><span><b>Private workspace</b><small>Team updates are secure</small></span></div><button className="nav-link signout" onClick={logout}><Icon name="logout"/><span>Sign out</span></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Icon name="menu" size={21}/></button><div className="page-heading"><span className="eyebrow">{user.role === "HEAD" ? "TEAM WORKSPACE" : "MY WORKSPACE"}</span><h1>{titles[pathname] ?? "Dashboard"}</h1></div><div className="topbar-actions"><div className="today-label"><Icon name="calendar" size={16}/><span>{todayLabel}</span></div><div className="profile-wrap"><button className="profile-button" aria-expanded={profileOpen} onClick={() => setProfileOpen((v) => !v)}><span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><span className="profile-info"><b>{user.name}</b><small>{user.designation}</small></span><Icon name="chevron" size={16}/></button>{profileOpen && <div className="profile-menu"><Link href="/manage-account" onClick={() => setProfileOpen(false)}><Icon name="settings" size={16}/>Manage account</Link><button onClick={logout}><Icon name="logout" size={16}/>Sign out</button></div>}</div></div></header>
      <WorkspaceUserContext.Provider value={user}><main className="page-content">{children}</main></WorkspaceUserContext.Provider>
      <footer className="footer"><span>Daily Work Tracker</span><span>Private team workspace</span></footer>
    </div>
  </div>;
}
