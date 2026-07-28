import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../../../db";
import { getCurrentUser, unauthorized } from "../../../lib/auth";
import { cleanText } from "../../../lib/validation";

export const runtime = "nodejs";

type CategoryRow = RowDataPacket & {
  id: number;
  name: string;
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [categories] = await getDb().execute<CategoryRow[]>(
    `SELECT id, name
       FROM categories
      WHERE user_id = ?
      ORDER BY name`,
    [user.id],
  );
  return Response.json({ categories });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 80);
  if (!name) {
    return Response.json(
      { error: "El nombre de la categoría es obligatorio." },
      { status: 400 },
    );
  }

  try {
    const [result] = await getDb().execute<ResultSetHeader>(
      "INSERT INTO categories (user_id, name) VALUES (?, ?)",
      [user.id, name],
    );
    return Response.json(
      { category: { id: result.insertId, name } },
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
        { error: "Ya tienes una categoría con ese nombre." },
        { status: 409 },
      );
    }
    throw error;
  }
}
