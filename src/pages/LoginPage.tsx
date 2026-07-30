import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.login(email, password);
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span className="sidebar__brand-mark" style={{ fontSize: 14, color: "var(--ink)" }}>
            ICGI
          </span>
          <h1 style={{ marginTop: 12 }}>Content Planner</h1>
          <p className="text-muted">Masuk untuk lanjut ke meja redaksi.</p>
        </div>

        <form onSubmit={handleSubmit} className="panel">
          <label className="field">
            <span className="field__label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
              placeholder="nama@icgi.id"
            />
          </label>

          <label className="field">
            <span className="field__label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
            />
          </label>

          {error && <p className="callout callout--error" style={{ marginBottom: 14 }}>{error}</p>}

          <button type="submit" className="btn btn--primary" disabled={isSubmitting} style={{ width: "100%", justifyContent: "center" }}>
            {isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}