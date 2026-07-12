import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { tasks } from "../../../../db/schema";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const taskId = Number(id); const body = await request.json();
  if (!Number.isInteger(taskId)) return Response.json({ error: "ID inválido" }, { status: 400 });
  const completedAt = body.status === "completada" ? new Date().toISOString() : null;
  const [task] = await getDb().update(tasks).set({ title: String(body.title ?? "").trim(), category: body.category || "PC", context: body.context || "", priority: body.priority || "Media", status: body.status || "pendiente", nextStep: body.nextStep || "", ifThen: body.ifThen || "", notes: body.notes || "", completedAt }).where(eq(tasks.id, taskId)).returning();
  return task ? Response.json({ task }) : Response.json({ error: "Pendiente no encontrado" }, { status: 404 });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params; const taskId = Number(id);
  await getDb().delete(tasks).where(eq(tasks.id, taskId));
  return new Response(null, { status: 204 });
}
