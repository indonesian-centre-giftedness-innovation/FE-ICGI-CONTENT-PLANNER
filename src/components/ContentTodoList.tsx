import { useEffect, useState } from "react";
import { api, type Todo, type SimpleUser } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";

export function ContentTodoList({ contentId }: { contentId: string }) {
  const confirmDialog = useConfirm();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [todoData, userData] = await Promise.all([
        api.listTodosForContent(contentId),
        api.listUsers(),
      ]);
      setTodos(todoData);
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat to-do");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await api.createTodo({ contentId, taskText: newTask.trim(), assignedTo: newAssignee || undefined });
      setNewTask("");
      setNewAssignee("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah task");
    }
  }

  async function handleToggle(todo: Todo) {
    try {
      await api.updateTodo(todo.id, { isDone: !todo.isDone });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status task");
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Hapus task ini?"))) return;
    try {
      await api.deleteTodo(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus task");
    }
  }

  const pendingCount = todos.filter((t) => !t.isDone).length;

  return (
    <div className="panel">
      <span className="eyebrow">
        To-Do Konten Ini {pendingCount > 0 && `(${pendingCount} tertunda)`}
      </span>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && todos.length === 0 && (
        <p className="text-muted" style={{ marginBottom: 10 }}>Belum ada task untuk draft ini.</p>
      )}

      {!isLoading && todos.length > 0 && (
        <div className="stack stack--sm" style={{ marginBottom: 12 }}>
          {todos.map((todo) => (
            <div
              key={todo.id}
              style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--paper-alt)", paddingBottom: 6 }}
            >
              <input type="checkbox" checked={todo.isDone} onChange={() => handleToggle(todo)} style={{ width: 16, height: 16 }} />
              <span style={{ flex: 1, fontSize: 13, textDecoration: todo.isDone ? "line-through" : "none", opacity: todo.isDone ? 0.5 : 1 }}>
                {todo.taskText}
              </span>
              <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>
                {todo.assignee?.name || "-"}
              </span>
              <button onClick={() => handleDelete(todo.id)} className="btn btn--sm btn--ghost" style={{ color: "var(--red)" }}>
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="btn-row">
        <input
          type="text"
          placeholder="Task baru..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: 140 }}
        />
        <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="select" style={{ maxWidth: 160 }}>
          <option value="">Belum di-assign</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--sm btn--primary">
          + Tambah
        </button>
      </form>
    </div>
  );
}