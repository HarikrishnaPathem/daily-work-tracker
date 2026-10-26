import { api, HttpError } from "@/lib/http";
import { currentUser } from "@/lib/auth";
export const GET = api(async () => {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Authentication required");
  return Response.json({ user: { id: user.id, name: user.name, designation: user.designation, email: user.email, role: user.role } });
});
