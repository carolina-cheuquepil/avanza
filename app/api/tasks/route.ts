import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../../../db";
import { getCurrentUser, unauthorized } from "../../../lib/auth";
import {
  cleanText,
  optionalText,
  parseBoolean,
  parseId,
  parsePriority,
  PRIORITIES,
  type Priority,
} from "../../../lib/validation";

export const runtime = "nodejs";

type TaskRow = RowDataPacket & {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  active: number;
  categoryId: number | null;
  categoryName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

async function categoryBelongsToUser(
  categoryId: number | null,
  userId: number,
): Promise<boolean> {
  if (categoryId === null) return true;
  const [rows] = await getDb().execute<RowDataPacket[]>(
    "SELECT id FROM categories WHERE id = ? AND user_id = ? LIMIT 1",
    [categoryId, userId],
  );
  return rows.length === 1;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const categoryId = parseId(url.searchParams.get("categoryId"));
  const priority = url.searchParams.get("priority");
  const active = url.searchParams.get("active");

  const clauses = ["t.user_id = ?"];
  const values: Array<string | number> = [user.id];

  if (categoryId) {
    clauses.push("t.category_id = ?");
    values.push(categoryId);
  }
  if (priority && PRIORITIES.includes(priority as Priority)) {
    clauses.push("t.priority = ?");
    values.push(priority);
  }
  if (active === "0" || active === "1") {
    clauses.push("t.active = ?");
    values.push(Number(active));
  }

  const [tasks] = await getDb().execute<TaskRow[]>(
    `SELECT t.id, t.title, t.description, t.priority, t.active,
            t.category_id AS categoryId, c.name AS categoryName,
            t.created_at AS createdAt, t.updated_at AS updatedAt
       FROM tasks t
       LEFT JOIN categories c
         ON c.id = t.category_id
        AND c.user_id = t.user_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY FIELD(t.priority, 'Alta', 'Media', 'Baja'), t.created_at DESC`,
    values,
  );

  return Response.json({
    tasks: tasks.map((task) => ({ ...task, active: Boolean(task.active) })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

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
  if (!(await categoryBelongsToUser(categoryId, user.id))) {
    return Response.json(
      { error: "La categoría seleccionada no es válida." },
      { status: 400 },
    );
  }

  const [result] = await getDb().execute<ResultSetHeader>(
    `INSERT INTO tasks
       (user_id, category_id, title, description, priority, active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user.id, categoryId, title, description, priority, active ? 1 : 0],
  );

  return Response.json({ task: { id: result.insertId } }, { status: 201 });
}
