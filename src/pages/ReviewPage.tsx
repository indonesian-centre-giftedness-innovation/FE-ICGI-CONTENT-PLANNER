import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type MediaPendingItem, type MediaAssetSummary } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/**
 * Draft script TIDAK butuh review sama sekali (langsung bisa dipakai pemiliknya).
 * Yang perlu direview cuma MEDIA (gambar/video) — halaman ini murni soal itu.
 */
export function ReviewPage() {
  const { user } = useAuth();
  const isLeadAdmin = user?.role === "lead_admin";

  return isLeadAdmin ? <LeadMediaQueue /> : <StaffMediaStatus />;
}

/** Lead/Admin — antrian media yang menunggu KEPUTUSAN mereka. */
function LeadMediaQueue() {
  const navigate = useNavigate();
  const [media, setMedia] = useState<MediaPendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPendingMedia()
      .then(setMedia)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat antrian review"))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <span className="eyebrow">Meja Editor</span>
      <h1>Review</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Media (gambar/video) yang menunggu keputusan kamu.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && (
        <>
          <h2>Media Menunggu Review ({media.length})</h2>
          {media.length === 0 ? (
            <div className="empty-state panel panel--dashed">Tidak ada media yang menunggu review.</div>
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
                      onClick={() => navigate(m.content ? `/content/${m.contentId}/media` : "/media/standalone")}
                    >
                      <td style={{ fontWeight: 700 }}>{m.fileName}</td>
                      <td>{m.content ? m.content.title : <span className="text-muted">Standalone</span>}</td>
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

/** Creator/Staff — status media MEREKA SENDIRI (bukan antrian keputusan, cuma buat pantau). */
function StaffMediaStatus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mine, setMine] = useState<MediaAssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAllMedia()
      .then((all) => setMine(all.filter((m) => m.uploadedBy === user?.userId)))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setIsLoading(false));
  }, [user?.userId]);

  const pending = mine.filter((m) => m.latestVersion?.status === "pending");
  const approved = mine.filter((m) => m.latestVersion?.status === "approved");

  function openMedia(m: MediaAssetSummary) {
    navigate(m.content ? `/content/${m.contentId}/media` : "/media/standalone");
  }

  return (
    <div>
      <span className="eyebrow">Meja Editor</span>
      <h1>Review</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Status media (gambar/video) yang sudah kamu upload.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ marginBottom: 2 }}>Menunggu Review ({pending.length})</h2>
            <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>
              Sudah kamu upload, tinggal tunggu keputusan Lead/Admin.
            </p>
            {pending.length === 0 ? (
              <div className="empty-state panel panel--dashed">Tidak ada.</div>
            ) : (
              <div className="stack stack--sm">
                {pending.map((m) => (
                  <div
                    key={m.id}
                    className="panel panel--flat row-clickable"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                    onClick={() => openMedia(m)}
                  >
                    <span style={{ fontWeight: 700 }}>{m.fileName}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {m.content ? m.content.title : "Standalone"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: 2 }}>Sudah Disetujui ({approved.length})</h2>
            {approved.length === 0 ? (
              <div className="empty-state panel panel--dashed">Tidak ada.</div>
            ) : (
              <div className="stack stack--sm">
                {approved.map((m) => (
                  <div
                    key={m.id}
                    className="panel panel--flat row-clickable"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                    onClick={() => openMedia(m)}
                  >
                    <span style={{ fontWeight: 700 }}>{m.fileName}</span>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {m.content ? m.content.title : "Standalone"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {mine.length === 0 && (
            <div className="empty-state panel panel--dashed">
              Belum ada media yang kamu upload. Upload lewat halaman Media & Review konten, atau Media &rarr; Media Baru.
            </div>
          )}
        </>
      )}
    </div>
  );
}