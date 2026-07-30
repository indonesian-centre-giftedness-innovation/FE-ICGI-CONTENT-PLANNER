import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type MediaAssetSummary } from "../lib/api";

export function MediaListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaAssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .listAllMedia()
      .then(setItems)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 0 }}>Media</h1>
        </div>
        <Link to="/media/standalone" className="btn btn--primary">
          + Media Baru (tanpa draft)
        </Link>
      </div>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Semua poster/video yang sudah diunggah, baik yang menempel ke konten maupun berdiri
        sendiri. Untuk approve/review, buka menu <strong>Review</strong>.
      </p>

      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada media diunggah. Buka draft konten, atau klik tombol di atas.
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>File</th>
                <th>Konten</th>
                <th>Status Versi Terbaru</th>
                <th>Jumlah Versi</th>
                <th>Diunggah</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr
                  key={m.id}
                  className="row-clickable"
                  onClick={() => navigate(m.content ? `/content/${m.contentId}/media` : "/media/standalone")}
                >
                  <td style={{ fontWeight: 700 }}>{m.fileName}</td>
                  <td>
                    {m.content ? m.content.title : <span className="text-muted">Standalone</span>}
                  </td>
                  <td>
                    {m.latestVersion ? (
                      <span
                        className="stamp"
                        style={{
                          color: m.latestVersion.status === "approved" ? "var(--green)" : "var(--blue)",
                        }}
                      >
                        {m.latestVersion.status === "approved" ? "Approved" : "Menunggu Review"}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{m.versionCount}</td>
                  <td className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {new Date(m.createdAt).toLocaleDateString("id-ID")}
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