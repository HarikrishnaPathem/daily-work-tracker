import type { ReactNode, SVGProps } from "react";

type Name = "grid" | "reports" | "users" | "settings" | "logout" | "menu" | "calendar" | "check" | "clock" | "alert" | "arrow" | "plus" | "search" | "filter" | "close" | "trend" | "briefcase" | "chevron" | "key";
const paths: Record<Name, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  reports: <><path d="M7 3.8h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5.3a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 4v4h4M9 13h6M9 17h6"/></>,
  users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20"/><circle cx="9.5" cy="7" r="3.5"/><path d="M17 4.2a3.5 3.5 0 0 1 0 6.7M21 20v-1.5a4 4 0 0 0-3-3.9"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1a1.8 1.8 0 1 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 1 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3H3.7a1.8 1.8 0 1 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 1 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 1 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 1 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z"/></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, alert: <><path d="M10.3 4.4 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.4a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>, plus: <><path d="M12 5v14M5 12h14"/></>, search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>, filter: <><path d="M4 6h16M7 12h10m-7 6h4"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>, trend: <><path d="m3 17 6-6 4 3 7-8"/><path d="M14 6h6v6"/></>, briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"/></>, chevron: <><path d="m7 10 5 5 5-5"/></>, key: <><circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8-8 2 2-2 2 2 2-3 3-2-2-3 3"/></>,
};
export function Icon({ name, size = 18, ...props }: SVGProps<SVGSVGElement> & { name: Name; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
