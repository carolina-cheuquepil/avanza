import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";

const seed = [
  ["DUOC tareas","PC","Internet","Alta"],["Claves internet","PC","Internet","Alta"],["Beneficios GitHub","PC","Internet","Alta"],["Licencia Project","PC","Internet","Alta"],["Contrademanda","PC","Internet","Alta"],
  ["Ordenar OneDrive","PC","Internet","Media"],["Notas Google","PC","Internet","Media"],["RRSS: eliminar fotos y guardados","PC","Internet","Media"],["¿Qué mantiene joven?","PC","Internet","Media"],["DUOC: qué aplicar al trabajo o empresa propia","PC","Internet","Media"],["Vender terreno: fotos 8 feb","PC","Internet","Media"],["Vuelos: cotizar","PC","Internet","Baja"],["Casas: cotizar","PC","Internet","Baja"],["Movistar: fotos","PC","Internet","Baja"],["Pesarme y medirme","PC","Excel","Media"],["Calorías","PC","Excel","Baja"],
  ["Notas WhatsApp","Celular","Internet","Alta"],["Jugar ajedrez","Celular","Internet","Alta"],["Vestido titulación","Celular","Internet","Media"],["Fotos celular","Celular","Internet","Media"],
  ["Cambiar monedas","Afuera","Banco","Media"],["Cuadro caracteres chinos","Afuera","Otros","Media"],["Comprar pilas AA","Afuera","Otros","Media"],["Zapatos","Afuera","Compras","Media"],["Decathlon: agua","Afuera","Compras","Media"],
  ["Bubbies","Trámites","Médicos","Alta"],["Lentes","Trámites","Médicos","Media"],["Dentista","Trámites","Médicos","Media"],["Psicóloga","Trámites","Médicos","Media"],["Depilación","Trámites","Médicos","Baja"],["Medicamentos hospital","Trámites","Médicos","Baja"],["Uñas pies: doctor","Trámites","Médicos","Baja"],
  ["Limpiar Outlook / Hotmail / Inacapmail","Limpiar","Correos","Media"],["Limpiar Gmail personal / trabajo / Duoc","Limpiar","Correos","Media"],["Limpiar ChatGPT","Limpiar","IA","Media"],["Ordenar OneGoogle 2016","Limpiar","Almacenamiento","Media"],["Ordenar OneDrive 2011","Limpiar","Almacenamiento","Media"]
] as const;

export async function GET() {
  const db = getDb();
  let rows = await db.select().from(tasks).orderBy(asc(tasks.id));
  if (rows.length === 0) {
    await db.insert(tasks).values(seed.map(([title, category, context, priority]) => ({ title, category, context, priority })));
    rows = await db.select().from(tasks).orderBy(asc(tasks.id));
  }
  return Response.json({ tasks: rows });
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = String(body.title ?? "").trim();
  if (!title) return Response.json({ error: "El título es obligatorio" }, { status: 400 });
  const db = getDb();
  const [task] = await db.insert(tasks).values({ title, category: body.category || "PC", context: body.context || "", priority: body.priority || "Media", nextStep: body.nextStep || "", ifThen: body.ifThen || "", notes: body.notes || "" }).returning();
  return Response.json({ task }, { status: 201 });
}
