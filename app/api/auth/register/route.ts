import type { ResultSetHeader } from "mysql2";
import { createSession, hashPassword } from "../../../../lib/auth";
import { cleanText, isValidEmail, normalizeEmail } from "../../../../lib/validation";
import { withTransaction } from "../../../../db";

export const runtime = "nodejs";

const DEFAULT_CATEGORIES = ["Personal", "Trabajo", "Estudio", "Salud"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 120);
  const email = normalizeEmail(body?.email);
  const password = String(body?.password ?? "");

  if (name.length < 2) {
    return Response.json(
      { error: "El nombre debe tener al menos 2 caracteres." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return Response.json(
      { error: "Ingresa un correo válido." },
      { status: 400 },
    );
  }
  if (password.length < 8 || password.length > 128) {
    return Response.json(
      { error: "La contraseña debe tener entre 8 y 128 caracteres." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(password);
    const userId = await withTransaction(async (connection) => {
      const [result] = await connection.execute<ResultSetHeader>(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        [name, email, passwordHash],
      );

      for (const category of DEFAULT_CATEGORIES) {
        await connection.execute(
          "INSERT INTO categories (user_id, name) VALUES (?, ?)",
          [result.insertId, category],
        );
      }
      return result.insertId;
    });

    await createSession(userId);
    return Response.json(
      { user: { id: userId, name, email } },
      { status: 201 },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    ) {
      return Response.json(
        { error: "Ya existe una cuenta con ese correo." },
        { status: 409 },
      );
    }
    console.error("Registration failed", error);
    return Response.json(
      { error: "No se pudo crear la cuenta." },
      { status: 500 },
    );
  }
}
