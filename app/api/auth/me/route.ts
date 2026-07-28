import { getCurrentUser, unauthorized } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  return user ? Response.json({ user }) : unauthorized();
}
