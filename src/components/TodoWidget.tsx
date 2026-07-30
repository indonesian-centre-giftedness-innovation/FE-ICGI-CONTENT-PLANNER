import { Link } from "react-router-dom";
import { api, type Todo } from "../lib/api";

export function TodoWidget({
  todos,
  onToggle,
}: {
  todos: Todo[];
  onToggle: () => void;
}) {
  const pending = todos.filter((t) => !t.isDone);
  const preview = pending.slice(0, 6);

  async function handleToggle(todo: Todo) {
    try {
      await api.updateTodo(todo.id, { isDone: !todo.isDone });
      onToggle();
    } catch {
      // gagal toggle, biarkan user coba lagi dari halaman To-Do lengkap
    }
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>To-Do</h3>
        <Link to="/todos" className="btn btn--sm">
          Lihat semua
        </Link>
      </div>

      {pending.length === 0 && (
        <p className="text-muted" style={{ margin: 0 }}>
          Tidak ada task tertunda. Mantap!
        </p>
      )}

      {pending.length > 0 && (
        <div className="stack stack--sm">
          {preview.map((todo) => (
            <label
              key={todo.id}
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={todo.isDone}
                onChange={() => handleToggle(todo)}
                style={{ width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontSize: 13 }}>{todo.taskText}</span>
              <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {todo.content?.title || "Standalone"}
              </span>
            </label>
          ))}
          {pending.length > preview.length && (
            <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
              +{pending.length - preview.length} task lainnya
            </p>
          )}
        </div>
      )}
    </div>
  );
}