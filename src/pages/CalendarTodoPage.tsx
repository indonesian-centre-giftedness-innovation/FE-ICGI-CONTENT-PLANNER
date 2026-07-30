import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type CalendarItem, type Todo, type SimpleUser } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";

export function CalendarTodoPage() {
  const confirmDialog = useConfirm();
  const { id: contentId } = useParams<{ id: string }>();

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newDate, setNewDate] = useState("");
  const [newPlatform, setNewPlatform] = useState("");

  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  async function load() {
    if (!contentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [calendarData, todoData, userData] = await Promise.all([
        api.listCalendarItemsForContent(contentId),
        api.listTodosForContent(contentId),
        api.listUsers(),
      ]);
      setItems(calendarData);
      setTodos(todoData);
      setUsers(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  async function handleAddSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!contentId || !newDate) return;
    try {
      await api.createCalendarItem({
        contentId,
        scheduledDate: new Date(newDate).toISOString(),
        platform: newPlatform.trim() || undefined,
      });
      setNewDate("");
      setNewPlatform("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah jadwal");
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!(await confirmDialog("Hapus jadwal ini?"))) return;
    try {
      await api.deleteCalendarItem(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus jadwal");
    }
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!contentId || !newTask.trim()) return;
    try {
      await api.createTodo({
        contentId,
        taskText: newTask.trim(),
        assignedTo: newAssignee || undefined,
      });
      setNewTask("");
      setNewAssignee("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah task");
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

  if (isLoading) return <p className="text-muted">Memuat...</p>;

  return (
    <div style={{ maxWidth: 620 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to={`/content/${contentId}/edit`}>&larr; Kembali ke draft konten</Link>
      </p>
      <span className="eyebrow">Produksi</span>
      <h1>Kalender & To-Do</h1>
      {error && <p className="callout callout--error">{error}</p>}

      <h2 style={{ marginTop: 28 }}>Jadwal Tayang</h2>

      {items.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: 12 }}>Belum ada jadwal tayang.</p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="dtable">
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
                    {new Date(item.scheduledDate).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td>{item.platform || "-"}</td>
                  <td>
                    <button onClick={() => handleDeleteSchedule(item.id)} className="btn btn--sm btn--danger">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAddSchedule} className="panel panel--dashed" style={{ marginBottom: 28 }}>
        <span className="eyebrow">Tambah jadwal tayang</span>
        <div className="btn-row">
          <input
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="input"
            style={{ maxWidth: 220 }}
          />
          <input
            type="text"
            placeholder="Platform (Instagram, Website, dll)"
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="input"
            style={{ maxWidth: 240 }}
          />
          <button type="submit" className="btn btn--primary">
            + Tambah
          </button>
        </div>
      </form>

      <h2>To-Do List</h2>

      {todos.length === 0 ? (
        <p className="text-muted" style={{ marginBottom: 12 }}>Belum ada task.</p>
      ) : (
        <div className="stack stack--sm" style={{ marginBottom: 16 }}>
          {todos.map((todo) => (
            <div key={todo.id} className="panel panel--tight" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={todo.isDone} onChange={() => handleToggleTodo(todo)} style={{ width: 18, height: 18 }} />
              <span style={{ flex: 1, textDecoration: todo.isDone ? "line-through" : "none", opacity: todo.isDone ? 0.5 : 1 }}>
                {todo.taskText}
              </span>
              <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {todo.assignee?.name || "BELUM DI-ASSIGN"}
              </span>
              <button onClick={() => handleDeleteTodo(todo.id)} className="btn btn--sm btn--danger">
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddTodo} className="panel panel--dashed">
        <span className="eyebrow">Tambah task baru</span>
        <div className="btn-row">
          <input
            type="text"
            placeholder="Nama task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="input"
            style={{ flex: 1, minWidth: 200 }}
          />
          <select value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)} className="select" style={{ maxWidth: 200 }}>
            <option value="">Belum di-assign</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn--primary">
            + Tambah
          </button>
        </div>
      </form>
    </div>
  );
}