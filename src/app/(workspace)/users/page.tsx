import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { UsersWorkspace } from "@/components/users-workspace";

export default async function UsersPage() {
  const user = await currentUser();
  if (user?.role !== "HEAD") redirect("/dashboard");
  return <UsersWorkspace />;
}
