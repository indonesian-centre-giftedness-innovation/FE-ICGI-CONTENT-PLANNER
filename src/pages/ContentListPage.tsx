import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type Content, type ContentStatus } from "../lib/api";
import { StatusStamp, STATUS_LABEL } from "../components/StatusStamp";
import { PillarBadge, PILLAR_LABEL } from "../components/PillarFunnelBadge";

export function ContentListPage() {
  const navigate = useNavigate();
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [pillarFilter, setPillarFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.listContents().then(setAllContents).catch(() => {});
  }, []);

  const platformOptions = useMemo(() => {
    const unique = new Set(allContents.flatMap((c) => c.platforms || []));
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
  }, [statusFilter, platformFilter, pillarFilter]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadContents();
  }

  const statuses = Object.keys(STATUS_LABEL) as ContentStatus[];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 4 }}>Konten</h1>
          <p className="text-muted">Semua draft/script — {allContents.length} total.</p>
        </div>
        <Link to="/content/new" className="btn btn--primary">
          + Buat Konten Baru
        </Link>
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
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select" style={{ maxWidth: 180 }}>
          <option value="">Semua status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="select" style={{ maxWidth: 160 }}>
          <option value="">Semua platform</option>
          {platformOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value)} className="select" style={{ maxWidth: 150 }}>
          <option value="">Semua pillar</option>
          {Object.entries(PILLAR_LABEL).map(([value, label]) => (
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
          Belum ada konten yang cocok. Coba ubah filter, atau mulai buat konten baru.
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
                <th>Status</th>
                <th>Penulis</th>
                <th>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((c) => (
                <tr key={c.id} className="row-clickable" onClick={() => navigate(`/content/${c.id}/edit`)}>
                  <td style={{ fontWeight: 700 }}>{c.title}</td>
                  <td>{c.platforms && c.platforms.length ? c.platforms.join(", ") : "-"}</td>
                  <td>
                    <PillarBadge pillar={c.pillar} />
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