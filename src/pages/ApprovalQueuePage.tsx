import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Content } from "../lib/api";

export function ApprovalQueuePage() {
  const [items, setItems] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await api.listPendingApprovals());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat antrian approval");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <span className="eyebrow">Meja Editor</span>
      <h1>Antrian Approval</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Konten yang menunggu review dari Lead/Admin.
      </p>

      {isLoading && <p className="text-muted">Memuat...</p>}
      {error && <p className="callout callout--error">{error}</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">Tidak ada konten yang menunggu review saat ini.</div>
      )}

      {items.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Platform</th>
                <th>Penulis</th>
                <th>Diperbarui</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.title}</td>
                  <td>{c.platform || "-"}</td>
                  <td className="text-muted">{c.author?.name || "-"}</td>
                  <td className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {new Date(c.updatedAt).toLocaleDateString("id-ID")}
                  </td>
                  <td>
                    <Link to={`/content/${c.id}/edit`} className="btn btn--sm btn--blue">
                      Review
                    </Link>
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