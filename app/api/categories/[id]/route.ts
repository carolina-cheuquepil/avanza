import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { categories, tasks } from "../../../../db/schema";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!Number.isInteger(categoryId) || !name) return Response.json({ error: "Datos inválidos" }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!current) return Response.json({ error: "Categoría no encontrada" }, { status: 404 });
  const [duplicate] = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
  if (duplicate && duplicate.id !== categoryId) return Response.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  try {
    const [category] = await db.update(categories).set({ name }).where(eq(categories.id, categoryId)).returning();
    await db.update(tasks).set({ category: name }).where(eq(tasks.category, current.name));
    return Response.json({ category });
  } catch {
    return Response.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const categoryId = Number(id);
  const db = getDb();
  const [current] = await db.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!current) return Response.json({ error: "Categoría no encontrada" }, { status: 404 });
  if (current.name === "Sin categoría") return Response.json({ error: "Esta categoría protege los pendientes sin clasificar" }, { status: 400 });
  await db.insert(categories).values({ name: "Sin categoría" }).onConflictDoNothing();
  await db.update(tasks).set({ category: "Sin categoría" }).where(eq(tasks.category, current.name));
  await db.delete(categories).where(eq(categories.id, categoryId));
  return new Response(null, { status: 204 });
}
