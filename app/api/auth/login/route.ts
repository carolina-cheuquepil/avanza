import type { RowDataPacket } from "mysql2";
import { createSession, verifyPassword } from "../../../../lib/auth";
import { getDb } from "../../../../db";
import { isValidEmail, normalizeEmail } from "../../../../lib/validation";

export const runtime = "nodejs";

type LoginRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password ?? "");

  if (!isValidEmail(email) || !password) {
    return Response.json(
      { error: "Correo o contraseña incorrectos." },
      { status: 401 },
    );
  }

  const [rows] = await getDb().execute<LoginRow[]>(
    `SELECT id, name, email, password_hash AS passwordHash
       FROM users
      WHERE email = ?
      LIMIT 1`,
    [email],
  );
  const user = rows[0];
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !valid) {
    return Response.json(
      { error: "Correo o contraseña incorrectos." },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}
