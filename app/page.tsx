"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Priority = "Alta" | "Media" | "Baja";
type Status = "pendiente" | "en_progreso" | "completada";
type Task = {
  id: number; title: string; category: string; context: string; priority: Priority;
  status: Status; nextStep: string; ifThen: string; notes: string;
  createdAt: string; completedAt: string | null;
};
type Category = { id: number; name: string; createdAt: string };

const emptyDraft = { title: "", category: "PC", context: "Internet", priority: "Media" as Priority, nextStep: "", ifThen: "", notes: "" };
function priorityClass(priority: Priority) { return priority.toLowerCase(); }

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState("Hoy");
  const [draft, setDraft] = useState(emptyDraft);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveLock = useRef(false);
  const celebrationTimer = useRef<number | null>(null);
  const [celebration, setCelebration] = useState<string | null>(null);

  async function load() {
    const [taskResponse, categoryResponse] = await Promise.all([fetch("/api/tasks"), fetch("/api/categories")]);
    const [taskData, categoryData] = await Promise.all([taskResponse.json(), categoryResponse.json()]);
    setTasks(taskData.tasks ?? []);
    setCategories(categoryData.categories ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const tick = window.setInterval(() => setTimer((value) => value === null ? null : value - 1), 1000);
    return () => window.clearInterval(tick);
  }, [timer]);
  useEffect(() => () => { if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current); }, []);

  const visible = useMemo(() => tasks.filter((task) => {
    if (filter === "Hechas") return task.status === "completada";
    if (filter === "Hoy") return task.status !== "completada";
    return task.category === filter && task.status !== "completada";
  }), [tasks, filter]);
  const pending = tasks.filter((task) => task.status !== "completada").length;
  const completed = tasks.filter((task) => task.status === "completada").length;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (saveLock.current) return;
    saveLock.current = true; setSavingTask(true); setSaveError("");
    try {
      const url = editing ? `/api/tasks/${editing.id}` : "/api/tasks";
      const response = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudo guardar el pendiente");
      }
      setDraft(emptyDraft); setEditing(null); setShowForm(false); await load();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "No se pudo guardar el pendiente");
    } finally {
      saveLock.current = false; setSavingTask(false);
    }
  }
  async function update(task: Task, changes: Partial<Task>) {
    await fetch(`/api/tasks/${task.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...task, ...changes }) });
    await load();
  }
  function showCelebration(title: string) {
    if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
    setCelebration(title);
    celebrationTimer.current = window.setTimeout(() => setCelebration(null), 2800);
  }
  async function toggleComplete(task: Task) {
    const completing = task.status !== "completada";
    await update(task, { status: completing ? "completada" : "pendiente" });
    if (completing) showCelebration(task.title);
  }
  async function completeFocus(task: Task) {
    await update(task, { status: "completada" });
    setTimer(null); setActiveTask(null); showCelebration(task.title);
  }
  async function remove(task: Task) {
    if (!window.confirm(`¿Eliminar “${task.title}”?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" }); await load();
  }
  function edit(task: Task) {
    setEditing(task); setDraft({ title: task.title, category: task.category, context: task.context, priority: task.priority, nextStep: task.nextStep, ifThen: task.ifThen, notes: task.notes }); setShowForm(true);
  }
  function start(task: Task) { setActiveTask(task); setTimer(600); if (task.status === "pendiente") update(task, { status: "en_progreso" }); }
  async function createCategory(event: FormEvent) {
    event.preventDefault(); setCategoryError("");
    const response = await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory }) });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) return setCategoryError(data.error || "No se pudo crear la categoría");
    setNewCategory(""); await load();
  }
  async function renameCategory(event: FormEvent) {
    event.preventDefault(); if (!editingCategory) return; setCategoryError("");
    const response = await fetch(`/api/categories/${editingCategory.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: categoryName }) });
    const data = await response.json();
    if (!response.ok) return setCategoryError(data.error || "No se pudo renombrar");
    if (filter === editingCategory.name) setFilter(categoryName.trim());
    setEditingCategory(null); setCategoryName(""); await load();
  }
  async function deleteCategory(category: Category) {
    if (!window.confirm(`¿Eliminar “${category.name}”? Sus pendientes pasarán a “Sin categoría”.`)) return;
    setCategoryError("");
    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) return setCategoryError(data.error || "No se pudo eliminar");
    if (filter === category.name) setFilter("Hoy"); await load();
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brandmark">✓</span><span>Avanza</span></div>
        <div className="topActions"><button className="categoryButton" onClick={() => { setCategoryError(""); setShowCategories(true); }}>Categorías</button><button className="iconButton" aria-label="Agregar pendiente" onClick={() => { setEditing(null); setDraft({...emptyDraft, category: categories[0]?.name || "Sin categoría"}); setShowForm(true); }}>＋</button></div>
      </header>

      <section className="hero">
        <div className="heroSparkles" aria-hidden="true"><span>✦</span><span>·</span><span>✧</span></div>
        <p className="eyebrow">TU ENERGÍA, NO TU CULPA</p>
        <h1 className="srOnly">¿Qué puedes hacer en solo 10 minutos?</h1>
        <img className="heroArt" src="/avanza-violet.png" alt="Avanza: pendientes sin culpa, con cinco compañeros mágicos violetas" />
        <p className="subtitle">No necesitas terminar. Solo necesitas dar un pasito pequeño.</p>
        <div className="stats"><div><strong>{pending}</strong><span>por avanzar</span></div><div><strong>{completed}</strong><span>ya logradas</span></div></div>
      </section>

      <nav className="filters" aria-label="Filtrar pendientes">
        {["Hoy", ...categories.map((category) => category.name), "Hechas"].map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}
      </nav>

      <section className="content">
        <div className="sectionHead"><div><p className="eyebrow">ENFOQUE ACTUAL</p><h2>{filter === "Hoy" ? "Tu siguiente paso" : filter}</h2></div><button className="textButton" onClick={() => setFilter("Hoy")}>Ver pendientes</button></div>
        {loading && <p className="empty">Preparando tus pendientes…</p>}
        {!loading && visible.length === 0 && <div className="empty"><span>✦</span><h3>Aquí hay espacio</h3><p>No tienes pendientes en esta vista.</p></div>}
        <div className="taskList">
          {visible.map((task, index) => <article className={`task pal${index % 4} ${index === 0 && filter === "Hoy" ? "featured" : ""}`} key={task.id}>
            <button className="check" aria-label={`Completar ${task.title}`} onClick={() => toggleComplete(task)}>{task.status === "completada" ? "✓" : ""}</button>
            <div className="taskBody">
              <div className="meta"><span className={`priority ${priorityClass(task.priority)}`}>{task.priority}</span><span>{task.category} · {task.context}</span></div>
              <h3>{task.title}</h3>
              <p className="next">{task.nextStep || "Define una primera acción tan pequeña que cueste decir que no."}</p>
              {task.ifThen && <p className="ifthen">Si–entonces: {task.ifThen}</p>}
              <div className="actions"><button className="start" onClick={() => start(task)}>▶ Empezar 10 min</button><button onClick={() => edit(task)} aria-label="Editar">Editar</button><button onClick={() => remove(task)} aria-label="Eliminar">Eliminar</button></div>
            </div>
            <span className="taskPal" aria-hidden="true"><i></i><i></i><b>⌣</b></span>
          </article>)}
        </div>
        <aside className="science"><span className="sciencePal">✦</span><div><strong>Tu compañero de pasos pequeños</strong><p>Una acción concreta y un momento definido ayudan a cerrar la brecha entre querer hacerlo y empezar.</p></div></aside>
      </section>

      <button className="fab" aria-label="Crear pendiente" onClick={() => { setEditing(null); setDraft({...emptyDraft, category: categories[0]?.name || "Sin categoría"}); setShowForm(true); }}>＋</button>

      {showForm && <div className="sheetBackdrop" onMouseDown={() => setShowForm(false)}><form className="sheet" onSubmit={save} onMouseDown={(e) => e.stopPropagation()}>
        <div className="handle"/><div className="sheetTitle"><div><p className="eyebrow">CAPTURA SIN FRICCIÓN</p><h2>{editing ? "Editar pendiente" : "Nuevo pendiente"}</h2></div><button type="button" className="close" onClick={() => setShowForm(false)}>×</button></div>
        <label>¿Qué quieres avanzar?<input required autoFocus value={draft.title} onChange={(e) => setDraft({...draft, title:e.target.value})} placeholder="Ej. Cotizar vuelos"/></label>
        <div className="formRow"><label>Categoría<select value={draft.category} onChange={(e) => setDraft({...draft, category:e.target.value})}>{categories.map(c => <option key={c.id}>{c.name}</option>)}</select></label><label>Prioridad<select value={draft.priority} onChange={(e) => setDraft({...draft, priority:e.target.value as Priority})}><option>Alta</option><option>Media</option><option>Baja</option></select></label></div>
        <label>Contexto<input value={draft.context} onChange={(e) => setDraft({...draft, context:e.target.value})} placeholder="Internet, Banco, Médico…"/></label>
        <label>Primer paso de menos de 10 min<input value={draft.nextStep} onChange={(e) => setDraft({...draft, nextStep:e.target.value})} placeholder="Abrir el sitio y anotar 3 opciones"/></label>
        <label>Plan si–entonces<input value={draft.ifThen} onChange={(e) => setDraft({...draft, ifThen:e.target.value})} placeholder="Si termino de almorzar, entonces abro…"/></label>
        <label>Notas<textarea value={draft.notes} onChange={(e) => setDraft({...draft, notes:e.target.value})}/></label>
        {saveError && <p className="categoryError" role="alert">{saveError}</p>}
        <button className="save" type="submit" disabled={savingTask} aria-busy={savingTask}>{savingTask ? "Guardando…" : editing ? "Guardar cambios" : "Crear pendiente"}</button>
      </form></div>}

      {showCategories && <div className="sheetBackdrop" onMouseDown={() => setShowCategories(false)}><section className="sheet categorySheet" onMouseDown={(e) => e.stopPropagation()}>
        <div className="handle"/><div className="sheetTitle"><div><p className="eyebrow">ORDENA TU UNIVERSO</p><h2>Mis categorías</h2></div><button type="button" className="close" onClick={() => setShowCategories(false)}>×</button></div>
        <form className="categoryCreate" onSubmit={createCategory}><label>Nueva categoría<input required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Ej. Casa"/></label><button type="submit">Crear</button></form>
        {categoryError && <p className="categoryError" role="alert">{categoryError}</p>}
        <div className="categoryList">
          {categories.map((category, index) => <div className={`categoryRow pal${index % 4}`} key={category.id}>
            <span className="categoryDot" aria-hidden="true">✦</span>
            {editingCategory?.id === category.id ? <form className="renameForm" onSubmit={renameCategory}><input required autoFocus value={categoryName} onChange={(e) => setCategoryName(e.target.value)}/><button type="submit">Guardar</button><button type="button" onClick={() => setEditingCategory(null)}>Cancelar</button></form> : <><strong>{category.name}</strong><span className="categoryCount">{tasks.filter((task) => task.category === category.name).length} pendientes</span><div className="categoryActions"><button onClick={() => { setEditingCategory(category); setCategoryName(category.name); setCategoryError(""); }}>Editar</button><button disabled={category.name === "Sin categoría"} onClick={() => deleteCategory(category)}>Eliminar</button></div></>}
          </div>)}
        </div>
      </section></div>}

      {celebration && <div className="celebration" role="status" aria-live="polite" onClick={() => setCelebration(null)}>
        <div className="confetti" aria-hidden="true"><span>✦</span><span>●</span><span>★</span><span>✧</span><span>●</span><span>✦</span></div>
        <div className="danceStage" aria-hidden="true">
          <span className="danceArm left"></span><span className="danceArm right"></span>
          <div className="dancePal"><i></i><i></i><b>◡</b><em>✦</em></div>
          <span className="danceLeg left"></span><span className="danceLeg right"></span>
        </div>
        <p className="celebrationKicker">¡PASITO LOGRADO!</p><h2>{celebration}</h2><p>Tu compañero está bailando por ti ✨</p>
      </div>}

      {timer !== null && activeTask && <div className="focusMode"><button className="closeFocus" onClick={() => { setTimer(null); setActiveTask(null); }}>×</button><p className="eyebrow">SOLO EMPEZAR</p><h2>{activeTask.title}</h2><div className="clock">{String(Math.floor(timer/60)).padStart(2,"0")}:{String(timer%60).padStart(2,"0")}</div><p>{activeTask.nextStep || "Haz la acción más pequeña posible."}</p><button className="done" onClick={() => completeFocus(activeTask)}>✓ Lo avancé</button><button className="pause" onClick={() => setTimer(timer === 0 ? 600 : 0)}>{timer === 0 ? "Reanudar" : "Pausar"}</button></div>}
    </main>
  );
}
