import type { ResultSetHeader } from "mysql2";
import { getDb } from "../../../../db";
import { getCurrentUser, unauthorized } from "../../../../lib/auth";
import { cleanText, parseId } from "../../../../lib/validation";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const categoryId = parseId(id);
  const body = await request.json().catch(() => null);
  const name = cleanText(body?.name, 80);
  if (!categoryId || !name) {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const [result] = await getDb().execute<ResultSetHeader>(
      "UPDATE categories SET name = ? WHERE id = ? AND user_id = ?",
      [name, categoryId, user.id],
    );
    return result.affectedRows
      ? Response.json({ category: { id: categoryId, name } })
      : Response.json({ error: "Categoría no encontrada." }, { status: 404 });
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const categoryId = parseId(id);
  if (!categoryId) {
    return Response.json({ error: "Categoría inválida." }, { status: 400 });
  }

  const [result] = await getDb().execute<ResultSetHeader>(
    "DELETE FROM categories WHERE id = ? AND user_id = ?",
    [categoryId, user.id],
  );
  return result.affectedRows
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Categoría no encontrada." }, { status: 404 });
}
