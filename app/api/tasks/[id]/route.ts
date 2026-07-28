import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../../../../db";
import { getCurrentUser, unauthorized } from "../../../../lib/auth";
import {
  cleanText,
  optionalText,
  parseBoolean,
  parseId,
  parsePriority,
} from "../../../../lib/validation";

export const runtime = "nodejs";

async function validCategory(categoryId: number | null, userId: number) {
  if (categoryId === null) return true;
  const [rows] = await getDb().execute<RowDataPacket[]>(
    "SELECT id FROM categories WHERE id = ? AND user_id = ? LIMIT 1",
    [categoryId, userId],
  );
  return rows.length === 1;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const taskId = parseId(id);
  if (!taskId) {
    return Response.json({ error: "Objetivo inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const title = cleanText(body?.title, 180);
  const description = optionalText(body?.description, 5000);
  const priority = parsePriority(body?.priority);
  const active = parseBoolean(body?.active, true);
  const categoryId =
    body?.categoryId === null || body?.categoryId === ""
      ? null
      : parseId(body?.categoryId);

  if (!title) {
    return Response.json(
      { error: "El nombre del objetivo es obligatorio." },
      { status: 400 },
    );
  }
  if (!(await validCategory(categoryId, user.id))) {
    return Response.json(
      { error: "La categoría seleccionada no es válida." },
      { status: 400 },
    );
  }

  const [result] = await getDb().execute<ResultSetHeader>(
    `UPDATE tasks
        SET title = ?, description = ?, category_id = ?, priority = ?, active = ?
      WHERE id = ? AND user_id = ?`,
    [
      title,
      description,
      categoryId,
      priority,
      active ? 1 : 0,
      taskId,
      user.id,
    ],
  );

  return result.affectedRows
    ? Response.json({ ok: true })
    : Response.json({ error: "Objetivo no encontrado." }, { status: 404 });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await context.params;
  const taskId = parseId(id);
  if (!taskId) {
    return Response.json({ error: "Objetivo inválido." }, { status: 400 });
  }

  const [result] = await getDb().execute<ResultSetHeader>(
    "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    [taskId, user.id],
  );
  return result.affectedRows
    ? new Response(null, { status: 204 })
    : Response.json({ error: "Objetivo no encontrado." }, { status: 404 });
}
