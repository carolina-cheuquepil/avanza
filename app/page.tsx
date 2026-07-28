"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type User = { id: number; name: string; email: string };
type Category = { id: number; name: string };
type Priority = "Alta" | "Media" | "Baja";
type Task = {
  id: number;
  title: string;
  description: string | null;
  categoryId: number | null;
  categoryName: string | null;
  priority: Priority;
  active: boolean;
  createdAt: string;
};

const emptyObjective = {
  title: "",
  description: "",
  categoryId: "",
  priority: "Media" as Priority,
  active: true,
};

async function readJson(response: Response) {
  if (response.status === 204) return {};
  return response.json().catch(() => ({}));
}

export default function Home() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [authDraft, setAuthDraft] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [objective, setObjective] = useState(emptyObjective);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [objectiveError, setObjectiveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("active");

  const loadWorkspace = useCallback(async () => {
    const [taskResponse, categoryResponse] = await Promise.all([
      fetch("/api/tasks", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" }),
    ]);
    if (taskResponse.status === 401 || categoryResponse.status === 401) {
      setUser(null);
      return;
    }
    const [taskData, categoryData] = await Promise.all([
      readJson(taskResponse),
      readJson(categoryResponse),
    ]);
    setTasks(taskData.tasks ?? []);
    setCategories(categoryData.categories ?? []);
  }, []);

  useEffect(() => {
    async function start() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        await loadWorkspace();
      }
      setBooting(false);
    }
    start();
  }, [loadWorkspace]);

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (
          categoryFilter !== "all" &&
          task.categoryId !== Number(categoryFilter)
        )
          return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter)
          return false;
        if (stateFilter === "active" && !task.active) return false;
        if (stateFilter === "inactive" && task.active) return false;
        return true;
      }),
    [tasks, categoryFilter, priorityFilter, stateFilter],
  );

  async function submitAuth(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    const response = await fetch(`/api/auth/${authMode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authDraft),
    });
    const data = await readJson(response);
    setAuthBusy(false);
    if (!response.ok) {
      setAuthError(data.error || "No se pudo completar el acceso.");
      return;
    }
    setUser(data.user);
    setAuthDraft({ name: "", email: "", password: "" });
    await loadWorkspace();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setTasks([]);
    setCategories([]);
    setAuthMode("login");
  }

  async function saveObjective(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setObjectiveError("");
    const response = await fetch(
      editingId ? `/api/tasks/${editingId}` : "/api/tasks",
      {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...objective,
          categoryId: objective.categoryId
            ? Number(objective.categoryId)
            : null,
        }),
      },
    );
    const data = await readJson(response);
    setSaving(false);
    if (!response.ok) {
      setObjectiveError(data.error || "No se pudo guardar el objetivo.");
      return;
    }
    setObjective(emptyObjective);
    setEditingId(null);
    await loadWorkspace();
  }

  function editObjective(task: Task) {
    setEditingId(task.id);
    setObjective({
      title: task.title,
      description: task.description ?? "",
      categoryId: task.categoryId ? String(task.categoryId) : "",
      priority: task.priority,
      active: task.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleObjective(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        categoryId: task.categoryId,
        priority: task.priority,
        active: !task.active,
      }),
    });
    await loadWorkspace();
  }

  async function removeObjective(task: Task) {
    if (!window.confirm(`¿Eliminar el objetivo “${task.title}”?`)) return;
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    await loadWorkspace();
  }

  async function createCategory(event: FormEvent) {
    event.preventDefault();
    setCategoryError("");
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setCategoryError(data.error || "No se pudo crear la categoría.");
      return;
    }
    setCategoryName("");
    await loadWorkspace();
    setObjective((current) => ({
      ...current,
      categoryId: String(data.category.id),
    }));
  }

  if (booting) {
    return (
      <main className="centerScreen">
        <div className="brandLarge">✓</div>
        <p>Preparando Avanza…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="authShell">
        <section className="authStory">
          <div className="brand"><span>✓</span> Avanza</div>
          <p className="eyebrow">OBJETIVOS PERSONALES</p>
          <h1>Un paso pequeño también cuenta.</h1>
          <p>
            Crea objetivos claros, ordénalos por prioridad y vuelve cada día a
            lo que realmente quieres avanzar.
          </p>
          <div className="authBenefits">
            <span>✓ Objetivos privados</span>
            <span>✓ Categorías personales</span>
            <span>✓ Sesión segura</span>
          </div>
        </section>

        <section className="authCard">
          <div className="authTabs">
            <button
              className={authMode === "register" ? "active" : ""}
              onClick={() => {
                setAuthMode("register");
                setAuthError("");
              }}
            >
              Crear cuenta
            </button>
            <button
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
            >
              Iniciar sesión
            </button>
          </div>
          <h2>
            {authMode === "register" ? "Comienza en Avanza" : "Qué bueno verte"}
          </h2>
          <form onSubmit={submitAuth}>
            {authMode === "register" && (
              <label>
                Nombre
                <input
                  autoComplete="name"
                  required
                  value={authDraft.name}
                  onChange={(event) =>
                    setAuthDraft({ ...authDraft, name: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              Correo
              <input
                type="email"
                autoComplete="email"
                required
                value={authDraft.email}
                onChange={(event) =>
                  setAuthDraft({ ...authDraft, email: event.target.value })
                }
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete={
                  authMode === "register" ? "new-password" : "current-password"
                }
                required
                value={authDraft.password}
                onChange={(event) =>
                  setAuthDraft({ ...authDraft, password: event.target.value })
                }
              />
            </label>
            {authError && <p className="formError">{authError}</p>}
            <button className="primaryButton" disabled={authBusy}>
              {authBusy
                ? "Procesando…"
                : authMode === "register"
                  ? "Crear mi cuenta"
                  : "Entrar a Avanza"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brand"><span>✓</span> Avanza</div>
        <div className="userMenu">
          <div>
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <section className="welcome">
        <div>
          <p className="eyebrow">TU ESPACIO PERSONAL</p>
          <h1>Hola, {user.name.split(" ")[0]}</h1>
          <p>¿Qué objetivo quieres acercar un poco hoy?</p>
        </div>
        <div className="summary">
          <strong>{tasks.filter((task) => task.active).length}</strong>
          <span>objetivos activos</span>
        </div>
      </section>

      <section className="workspace">
        <aside className="objectivePanel">
          <p className="eyebrow">
            {editingId ? "EDITAR OBJETIVO" : "NUEVO OBJETIVO"}
          </p>
          <h2>{editingId ? "Ajusta tu objetivo" : "Crea tu próximo paso"}</h2>
          <form onSubmit={saveObjective}>
            <label>
              Nombre
              <input
                required
                maxLength={180}
                placeholder="Ej. Caminar 20 minutos"
                value={objective.title}
                onChange={(event) =>
                  setObjective({ ...objective, title: event.target.value })
                }
              />
            </label>
            <label>
              Descripción opcional
              <textarea
                maxLength={5000}
                placeholder="Qué quieres conseguir y por qué importa"
                value={objective.description}
                onChange={(event) =>
                  setObjective({
                    ...objective,
                    description: event.target.value,
                  })
                }
              />
            </label>
            <div className="formGrid">
              <label>
                Categoría
                <select
                  value={objective.categoryId}
                  onChange={(event) =>
                    setObjective({
                      ...objective,
                      categoryId: event.target.value,
                    })
                  }
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prioridad
                <select
                  value={objective.priority}
                  onChange={(event) =>
                    setObjective({
                      ...objective,
                      priority: event.target.value as Priority,
                    })
                  }
                >
                  <option>Alta</option>
                  <option>Media</option>
                  <option>Baja</option>
                </select>
              </label>
            </div>
            <label className="switchLabel">
              <input
                type="checkbox"
                checked={objective.active}
                onChange={(event) =>
                  setObjective({ ...objective, active: event.target.checked })
                }
              />
              Objetivo activo
            </label>
            {objectiveError && (
              <p className="formError">{objectiveError}</p>
            )}
            <button className="primaryButton" disabled={saving}>
              {saving
                ? "Guardando…"
                : editingId
                  ? "Guardar cambios"
                  : "Crear objetivo"}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondaryButton"
                onClick={() => {
                  setEditingId(null);
                  setObjective(emptyObjective);
                }}
              >
                Cancelar edición
              </button>
            )}
          </form>

          <form className="categoryCreator" onSubmit={createCategory}>
            <label>
              Nueva categoría
              <div>
                <input
                  required
                  maxLength={80}
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Ej. Finanzas"
                />
                <button>Agregar</button>
              </div>
            </label>
            {categoryError && <p className="formError">{categoryError}</p>}
          </form>
        </aside>

        <section className="objectives">
          <div className="sectionHeading">
            <div>
              <p className="eyebrow">MIS OBJETIVOS</p>
              <h2>Lo que estás construyendo</h2>
            </div>
            <span>{visibleTasks.length} resultados</span>
          </div>

          <div className="filters">
            <select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">Todas las categorías</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filtrar por prioridad"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
            >
              <option value="all">Todas las prioridades</option>
              <option>Alta</option>
              <option>Media</option>
              <option>Baja</option>
            </select>
            <select
              aria-label="Filtrar por estado"
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
            >
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </select>
          </div>

          <div className="objectiveList">
            {visibleTasks.length === 0 && (
              <div className="emptyState">
                <span>✦</span>
                <h3>Aquí comienza tu siguiente objetivo</h3>
                <p>Créalo en el formulario y aparecerá en este espacio.</p>
              </div>
            )}
            {visibleTasks.map((task) => (
              <article className={!task.active ? "inactive" : ""} key={task.id}>
                <div className="objectiveTop">
                  <span className={`priority ${task.priority.toLowerCase()}`}>
                    {task.priority}
                  </span>
                  <span>{task.categoryName || "Sin categoría"}</span>
                </div>
                <h3>{task.title}</h3>
                {task.description && <p>{task.description}</p>}
                <div className="objectiveActions">
                  <button onClick={() => toggleObjective(task)}>
                    {task.active ? "Desactivar" : "Activar"}
                  </button>
                  <button onClick={() => editObjective(task)}>Editar</button>
                  <button
                    className="danger"
                    onClick={() => removeObjective(task)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
