import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { DashboardShell, type SafeUser } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const safeUser: SafeUser = { id: user.id, name: user.name, email: user.email, designation: user.designation, role: user.role };
  const initialNow = new Date().toISOString();
  return <DashboardShell user={safeUser} initialNow={initialNow}>{children}</DashboardShell>;
}
