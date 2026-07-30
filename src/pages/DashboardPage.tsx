import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Content, type ContentStatus, type CalendarItem, type Todo } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusStamp, STATUS_LABEL } from "../components/StatusStamp";
import { CalendarWidget } from "../components/CalendarWidget";
import { TodoWidget } from "../components/TodoWidget";
import { PillarBadge, FunnelBadge, PILLAR_LABEL, FUNNEL_LABEL } from "../components/PillarFunnelBadge";

const STAT_ACCENT: Record<ContentStatus, string> = {
  draft: "#8a8a8f",
  pending_review: "var(--blue)",
  revisi: "var(--red)",
  approved: "var(--green)",
  published: "var(--yellow)",
};

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [pillarFilter, setPillarFilter] = useState<string>("");
  const [funnelFilter, setFunnelFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

  async function handleExportExcel() {
    setIsExporting("excel");
    setError(null);
    try {
      await api.exportContentExcel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal export Excel");
    } finally {
      setIsExporting(null);
    }
  }

  async function handleExportPdf() {
    setIsExporting("pdf");
    setError(null);
    try {
      await api.exportContentPdf();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal export PDF");
    } finally {
      setIsExporting(null);
    }
  }

  // dipakai buat kartu ringkasan & daftar platform unik — selalu total keseluruhan, tidak ikut filter tabel
  useEffect(() => {
    api.listContents().then(setAllContents).catch(() => {});
    api.listCalendarItems().then(setCalendarItems).catch(() => {});
    api.listAllTodos().then(setTodos).catch(() => {});
  }, []);

  const platformOptions = useMemo(() => {
    const unique = new Set(allContents.map((c) => c.platform).filter((p): p is string => !!p));
    return Array.from(unique).sort();
  }, [allContents]);

  async function loadContents() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listContents({
        status: statusFilter || undefined,
        search: search || undefined,
        platform: platformFilter || undefined,
        pillar: pillarFilter || undefined,
        funnel: funnelFilter || undefined,
      });
      setContents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat konten");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, platformFilter, pillarFilter, funnelFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadContents();
  }

  const statuses = Object.keys(STATUS_LABEL) as ContentStatus[];
  const countFor = (s: ContentStatus) => allContents.filter((c) => c.status === s).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 4 }}>Dashboard Konten</h1>
          <p className="text-muted">
            Login sebagai {user?.role === "lead_admin" ? "Lead/Admin" : "Creator/Staff"}
          </p>
        </div>
        <div className="btn-row">
          <button onClick={handleExportExcel} disabled={isExporting !== null} className="btn btn--sm">
            {isExporting === "excel" ? "Membuat..." : "Export Excel"}
          </button>
          <button onClick={handleExportPdf} disabled={isExporting !== null} className="btn btn--sm">
            {isExporting === "pdf" ? "Membuat..." : "Export PDF"}
          </button>
          <Link to="/content/new" className="btn btn--primary">
            + Buat Draft Baru
          </Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card" style={{ ["--accent" as string]: "var(--ink)" }}>
          <div className="stat-card__value">{allContents.length}</div>
          <span className="stat-card__label">Total Konten</span>
        </div>
        {statuses.map((s) => (
          <div key={s} className="stat-card" style={{ ["--accent" as string]: STAT_ACCENT[s] }}>
            <div className="stat-card__value">{countFor(s)}</div>
            <span className="stat-card__label">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-widgets">
        <CalendarWidget items={calendarItems} />
        <TodoWidget todos={todos} onToggle={() => api.listAllTodos().then(setTodos).catch(() => {})} />
      </div>

      <form onSubmit={handleSearchSubmit} className="btn-row" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Cari judul konten..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input"
          style={{ maxWidth: 220, flex: 1, minWidth: 160 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select"
          style={{ maxWidth: 180 }}
        >
          <option value="">Semua status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="select"
          style={{ maxWidth: 160 }}
        >
          <option value="">Semua platform</option>
          {platformOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value)}
          className="select"
          style={{ maxWidth: 150 }}
        >
          <option value="">Semua pillar</option>
          {Object.entries(PILLAR_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={funnelFilter}
          onChange={(e) => setFunnelFilter(e.target.value)}
          className="select"
          style={{ maxWidth: 140 }}
        >
          <option value="">Semua funnel</option>
          {Object.entries(FUNNEL_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn">
          Cari
        </button>
      </form>

      {isLoading && <p className="text-muted">Memuat...</p>}
      {error && <p className="callout callout--error">{error}</p>}

      {!isLoading && !error && contents.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada konten yang cocok. Coba ubah filter, atau mulai buat draft baru.
        </div>
      )}

      {!isLoading && contents.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Platform</th>
                <th>Pillar</th>
                <th>Funnel</th>
                <th>Status</th>
                <th>Penulis</th>
                <th>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((c) => (
                <tr key={c.id} className="row-clickable" onClick={() => navigate(`/content/${c.id}/edit`)}>
                  <td style={{ fontWeight: 700 }}>{c.title}</td>
                  <td>{c.platform || "-"}</td>
                  <td>
                    <PillarBadge pillar={c.pillar} />
                  </td>
                  <td>
                    <FunnelBadge funnel={c.funnel} />
                  </td>
                  <td>
                    <StatusStamp status={c.status} />
                  </td>
                  <td className="text-muted">{c.author?.name || "-"}</td>
                  <td className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {new Date(c.updatedAt).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}