import { destroySession } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await destroySession();
  return new Response(null, { status: 204 });
}
