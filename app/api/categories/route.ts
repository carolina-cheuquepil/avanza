import { asc } from "drizzle-orm";
import { getDb } from "../../../db";
import { categories } from "../../../db/schema";

const initialCategories = ["PC", "Celular", "Afuera", "Trámites", "Limpiar", "Cuadernos", "Sin categoría"];

export async function GET() {
  const db = getDb();
  let rows = await db.select().from(categories).orderBy(asc(categories.name));
  if (rows.length === 0) {
    await db.insert(categories).values(initialCategories.map((name) => ({ name }))).onConflictDoNothing();
    rows = await db.select().from(categories).orderBy(asc(categories.name));
  }
  return Response.json({ categories: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });
  try {
    const [category] = await getDb().insert(categories).values({ name }).returning();
    return Response.json({ category }, { status: 201 });
  } catch {
    return Response.json({ error: "Ya existe una categoría con ese nombre" }, { status: 409 });
  }
}
