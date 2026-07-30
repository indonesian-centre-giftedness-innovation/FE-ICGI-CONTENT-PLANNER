import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Content, type MediaPendingItem } from "../lib/api";

export function ReviewPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<Content[]>([]);
  const [media, setMedia] = useState<MediaPendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [d, m] = await Promise.all([api.listPendingApprovals(), api.listPendingMedia()]);
      setDrafts(d);
      setMedia(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat antrian review");
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
      <h1>Review</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Draft dan media yang menunggu keputusan kamu.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && (
        <>
          <h2>Draft Menunggu Review ({drafts.length})</h2>
          {drafts.length === 0 ? (
            <div className="empty-state panel panel--dashed" style={{ marginBottom: 28 }}>
              Tidak ada draft yang menunggu review.
            </div>
          ) : (
            <div className="table-wrap" style={{ marginBottom: 28 }}>
              <table className="dtable">
                <thead>
                  <tr>
                    <th>Judul</th>
                    <th>Platform</th>
                    <th>Penulis</th>
                    <th>Diperbarui</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((c) => (
                    <tr
                      key={c.id}
                      className="row-clickable"
                      onClick={() => navigate(`/content/${c.id}/edit`)}
                    >
                      <td style={{ fontWeight: 700 }}>{c.title}</td>
                      <td>{c.platform || "-"}</td>
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

          <h2>Media Menunggu Review ({media.length})</h2>
          {media.length === 0 ? (
            <div className="empty-state panel panel--dashed">
              Tidak ada media yang menunggu review.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="dtable">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Konten</th>
                    <th>Versi</th>
                  </tr>
                </thead>
                <tbody>
                  {media.map((m) => (
                    <tr
                      key={m.id}
                      className="row-clickable"
                      onClick={() =>
                        navigate(m.content ? `/content/${m.contentId}/media` : "/media/standalone")
                      }
                    >
                      <td style={{ fontWeight: 700 }}>{m.fileName}</td>
                      <td>
                        {m.content ? m.content.title : <span className="text-muted">Standalone</span>}
                      </td>
                      <td>v{m.pendingVersion.versionNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}