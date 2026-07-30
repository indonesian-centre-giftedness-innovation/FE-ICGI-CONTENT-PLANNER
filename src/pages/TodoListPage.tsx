import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Todo, type SimpleUser, type Content } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";

type Filter = "all" | "pending" | "done";

export function TodoListPage() {
  const confirmDialog = useConfirm();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("pending");

  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newContentId, setNewContentId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [todoData, userData, contentData] = await Promise.all([
        api.listAllTodos(),
        api.listUsers(),
        api.listContents(),
      ]);
      setTodos(todoData);
      setUsers(userData);
      setContents(contentData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      await api.createTodo({
        taskText: newTask.trim(),
        assignedTo: newAssignee || undefined,
        contentId: newContentId || undefined,
      });
      setNewTask("");
      setNewAssignee("");
      setNewContentId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah task");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    try {
      await api.updateTodo(todo.id, { isDone: !todo.isDone });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status task");
    }
  }

  async function handleDeleteTodo(id: string) {
    if (!(await confirmDialog("Hapus task ini?"))) return;
    try {
      await api.deleteTodo(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus task");
    }
  }

  const filtered = todos.filter((t) => {
    if (filter === "pending") return !t.isDone;
    if (filter === "done") return t.isDone;
    return true;
  });

  const pendingCount = todos.filter((t) => !t.isDone).length;

  // kelompokkan jadi card terpisah per pembuat task — tetap tampil ke semua akun,
  // cuma dipisah visual per pembuatnya
  const groups = new Map<string, { name: string; todos: Todo[] }>();
  for (const todo of filtered) {
    const key = todo.creator?.id || "unknown";
    const name = todo.creator?.name || "Tidak diketahui";
    if (!groups.has(key)) groups.set(key, { name, todos: [] });
    groups.get(key)!.todos.push(todo);
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <span className="eyebrow">Meja Redaksi</span>
      <h1 style={{ marginBottom: 6 }}>
        To-Do {pendingCount > 0 && <span className="badge-count">{pendingCount} tertunda</span>}
      </h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Semua task, baik yang menempel ke draft konten maupun berdiri sendiri (manual).
      </p>

      {error && <p className="callout callout--error">{error}</p>}

      <div className="btn-row" style={{ marginBottom: 16 }}>
        <button
          className={`btn btn--sm ${filter === "pending" ? "btn--primary" : ""}`}
          onClick={() => setFilter("pending")}
        >
          Tertunda
        </button>
        <button
          className={`btn btn--sm ${filter === "done" ? "btn--primary" : ""}`}
          onClick={() => setFilter("done")}
        >
          Selesai
        </button>
        <button
          className={`btn btn--sm ${filter === "all" ? "btn--primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          Semua
        </button>
      </div>

      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state panel panel--dashed" style={{ marginBottom: 20 }}>
          Tidak ada task di kategori ini.
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="stack" style={{ marginBottom: 24 }}>
          {Array.from(groups.entries()).map(([creatorId, group]) => (
            <div key={creatorId} className="panel">
              <span className="eyebrow">Dibuat oleh {group.name}</span>
              <div className="stack stack--sm">
                {group.todos.map((todo) => (
                  <div
                    key={todo.id}
                    className="panel panel--tight"
                    style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                  >
                    <input
                      type="checkbox"
                      checked={todo.isDone}
                      onChange={() => handleToggleTodo(todo)}
                      style={{ width: 18, height: 18 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 140,
                        textDecoration: todo.isDone ? "line-through" : "none",
                        opacity: todo.isDone ? 0.5 : 1,
                      }}
                    >
                      {todo.taskText}
                    </span>
                    {todo.content ? (
                      <Link
                        to={`/content/${todo.content.id}/calendar`}
                        className="stamp"
                        style={{ fontSize: 10, color: "var(--blue)" }}
                      >
                        {todo.content.title}
                      </Link>
                    ) : (
                      <span className="stamp" style={{ fontSize: 10, color: "#8a8a8f" }}>
                        Standalone
                      </span>
                    )}
                    <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      → {todo.assignee?.name || "belum di-assign"}
                    </span>
                    <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {new Date(todo.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </span>
                    <button onClick={() => handleDeleteTodo(todo.id)} className="btn btn--sm btn--danger">
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddTodo} className="panel panel--dashed">
        <span className="eyebrow">Tambah task baru</span>
        <label className="field">
          <span className="field__label">Nama task</span>
          <input
            type="text"
            placeholder="Misal: Siapkan brief untuk klien"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="input"
          />
        </label>

        <div className="btn-row" style={{ marginBottom: 12 }}>
          <select
            value={newContentId}
            onChange={(e) => setNewContentId(e.target.value)}
            className="select"
            style={{ maxWidth: 260 }}
          >
            <option value="">Tanpa draft (standalone)</option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="select"
            style={{ maxWidth: 200 }}
          >
            <option value="">Belum di-assign</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isAdding} className="btn btn--primary">
          {isAdding ? "Menambah..." : "+ Tambah Task"}
        </button>
      </form>
    </div>
  );
}