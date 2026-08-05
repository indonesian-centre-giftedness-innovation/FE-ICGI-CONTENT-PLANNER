import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Content, type MediaPendingItem, type ContentStatus } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusStamp } from "../components/StatusStamp";

export function ReviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLeadAdmin = user?.role === "lead_admin";

  return isLeadAdmin ? <LeadReviewQueue /> : <StaffReviewStatus />;
}

/** Lead/Admin — antrian draft & media yang menunggu KEPUTUSAN mereka. */
function LeadReviewQueue() {
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
                    <tr key={c.id} className="row-clickable" onClick={() => navigate(`/content/${c.id}/edit`)}>
                      <td style={{ fontWeight: 700 }}>{c.title}</td>
                      <td>{c.platforms && c.platforms.length ? c.platforms.join(", ") : "-"}</td>
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

const STAFF_SECTIONS: { status: ContentStatus; title: string; hint: string }[] = [
  { status: "pending_review", title: "Menunggu Review", hint: "Sudah kamu submit, tinggal tunggu keputusan Lead/Admin." },
  { status: "revisi", title: "Perlu Direvisi", hint: "Ada catatan dari Lead/Admin, cek dan perbaiki draftnya." },
  { status: "approved", title: "Disetujui, Siap Tayang", hint: "Menunggu Lead/Admin menandai tayang." },
  { status: "published", title: "Sudah Tayang", hint: "Sudah publish." },
];

/** Creator/Staff — status draft MEREKA SENDIRI yang sedang direview (bukan antrian keputusan). */
function StaffReviewStatus() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mine, setMine] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listContents()
      .then((all) => setMine(all.filter((c) => c.createdBy === user?.userId && c.status !== "draft")))
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setIsLoading(false));
  }, [user?.userId]);

  return (
    <div>
      <span className="eyebrow">Meja Editor</span>
      <h1>Review</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Status draft kamu yang sedang atau sudah direview Lead/Admin.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading &&
        STAFF_SECTIONS.map((section) => {
          const items = mine.filter((c) => c.status === section.status);
          return (
            <div key={section.status} style={{ marginBottom: 24 }}>
              <h2 style={{ marginBottom: 2 }}>
                {section.title} ({items.length})
              </h2>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>
                {section.hint}
              </p>
              {items.length === 0 ? (
                <div className="empty-state panel panel--dashed">Tidak ada.</div>
              ) : (
                <div className="stack stack--sm">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="panel panel--flat row-clickable"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
                      onClick={() => navigate(`/content/${c.id}/edit`)}
                    >
                      <span style={{ fontWeight: 700 }}>{c.title}</span>
                      <StatusStamp status={c.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {!isLoading && mine.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada draft yang disubmit untuk review. Submit draft dari halaman edit konten dulu.
        </div>
      )}
    </div>
  );
}