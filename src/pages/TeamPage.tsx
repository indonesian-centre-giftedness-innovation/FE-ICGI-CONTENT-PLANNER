import { useEffect, useState } from "react";
import { api, type TeamMember } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";

export function TeamPage() {
  const { user } = useAuth();
  const confirmDialog = useConfirm();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"lead_admin" | "creator_staff">("creator_staff");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setMembers(await api.listTeamMembers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat anggota tim");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Nama, email, dan password wajib diisi");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await api.createTeamMember({ name: name.trim(), email: email.trim(), password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("creator_staff");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat akun");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(member: TeamMember) {
    if (member.id === user?.userId) return;
    try {
      await api.updateTeamMember(member.id, { isActive: !member.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status akun");
    }
  }

  async function handleChangeRole(member: TeamMember, newRole: "lead_admin" | "creator_staff") {
    try {
      await api.updateTeamMember(member.id, { role: newRole });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah role");
    }
  }

  async function handleDelete(member: TeamMember) {
    const ok = await confirmDialog(
      `Hapus akun "${member.name}" secara permanen? Ini tidak bisa dibatalkan.`,
      { confirmLabel: "Ya, Hapus Permanen" }
    );
    if (!ok) return;
    setDeletingId(member.id);
    setError(null);
    try {
      await api.deleteTeamMember(member.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus akun");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 780 }}>
      <span className="eyebrow">Redaksi</span>
      <h1>Anggota Tim</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Buat akun untuk anggota baru, atur role, atau nonaktifkan akun yang sudah tidak aktif.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="dtable">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.id === user?.userId;
                return (
                  <tr key={m.id} style={{ opacity: m.isActive ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 700 }}>
                      {m.name} {isSelf && <span className="text-muted">(kamu)</span>}
                    </td>
                    <td className="text-muted">{m.email}</td>
                    <td>
                      <select
                        value={m.role}
                        onChange={(e) => handleChangeRole(m, e.target.value as TeamMember["role"])}
                        disabled={isSelf}
                        className="select"
                        style={{ maxWidth: 150 }}
                      >
                        <option value="lead_admin">Lead/Admin</option>
                        <option value="creator_staff">Creator/Staff</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className="stamp"
                        style={{ fontSize: 10, color: m.isActive ? "var(--green)" : "#8a8a8f" }}
                      >
                        {m.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="btn-row">
                        <button
                          onClick={() => handleToggleActive(m)}
                          disabled={isSelf}
                          className={`btn btn--sm ${m.isActive ? "btn--danger" : ""}`}
                        >
                          {m.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          disabled={isSelf || deletingId === m.id}
                          className="btn btn--sm btn--danger"
                          title="Hapus permanen"
                        >
                          {deletingId === m.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleCreate} className="panel panel--dashed">
        <span className="eyebrow">Tambah anggota baru</span>

        <div className="btn-row" style={{ marginBottom: 12 }}>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <span className="field__label">Nama</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </label>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <span className="field__label">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </label>
        </div>

        <div className="btn-row" style={{ marginBottom: 14 }}>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <span className="field__label">Password awal</span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="input"
            />
          </label>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 180 }}>
            <span className="field__label">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "lead_admin" | "creator_staff")}
              className="select"
            >
              <option value="creator_staff">Creator/Staff</option>
              <option value="lead_admin">Lead/Admin</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={isSaving} className="btn btn--primary">
          {isSaving ? "Membuat..." : "+ Buat Akun"}
        </button>
      </form>
    </div>
  );
}