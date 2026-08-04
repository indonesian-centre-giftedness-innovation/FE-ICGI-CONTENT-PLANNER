import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, mediaFileUrl, type MediaAssetSummary } from "../lib/api";

function MediaThumb({ item }: { item: MediaAssetSummary }) {
  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");

  if (item.latestVersion && isImage) {
    return <img src={mediaFileUrl(item.latestVersion.id)} alt={item.fileName} className="media-grid__thumb" />;
  }
  if (item.latestVersion && isVideo) {
    return (
      <video src={mediaFileUrl(item.latestVersion.id)} muted className="media-grid__thumb" />
    );
  }
  return (
    <div className="media-grid__thumb media-grid__thumb--file">
      {item.fileName}
    </div>
  );
}

export function MediaListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaAssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAllMedia()
      .then(setItems)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleDownload(e: React.MouseEvent, item: MediaAssetSummary) {
    e.stopPropagation();
    if (!item.latestVersion) return;
    setDownloadingId(item.id);
    try {
      await api.downloadMediaVersion(item.latestVersion.id, item.fileName);
    } catch {
      // gagal diam-diam di sini, halaman detail tetap punya pesan error kalau perlu
    } finally {
      setDownloadingId(null);
    }
  }

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
        Semua poster/video yang sudah diunggah. Untuk approve/review, buka menu <strong>Review</strong>.
      </p>

      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada media diunggah. Buka draft konten, atau klik tombol di atas.
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="media-grid">
          {items.map((m) => (
            <div
              key={m.id}
              className="media-grid__item"
              onClick={() => navigate(m.content ? `/content/${m.contentId}/media` : "/media/standalone")}
              title={m.fileName}
            >
              <MediaThumb item={m} />
              {!m.content && <span className="media-grid__badge">Standalone</span>}
              {m.latestVersion && (
                <button
                  onClick={(e) => handleDownload(e, m)}
                  disabled={downloadingId === m.id}
                  className="media-grid__download"
                  title="Unduh file"
                >
                  {downloadingId === m.id ? "…" : "⬇"}
                </button>
              )}
              <div className="media-grid__caption">{m.fileName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}