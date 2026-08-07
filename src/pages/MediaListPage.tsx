import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, mediaFileUrl, type MediaAssetSummary } from "../lib/api";

function MediaThumb({ item }: { item: MediaAssetSummary }) {
  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");

  if (item.latestVersion && isImage) {
    return (
      <img
        src={mediaFileUrl(item.latestVersion.id)}
        alt={item.fileName}
        crossOrigin="anonymous"
        className="media-grid__thumb"
      />
    );
  }
  if (item.latestVersion && isVideo) {
    return (
      <video
        src={mediaFileUrl(item.latestVersion.id)}
        muted
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
        className="media-grid__thumb"
      />
    );
  }
  return <div className="media-grid__thumb media-grid__thumb--file">{item.fileName}</div>;
}

/** Lightbox fullscreen — klik thumbnail buka gambar/video penuh layar, bukan pindah halaman. */
function MediaLightbox({ item, onClose }: { item: MediaAssetSummary; onClose: () => void }) {
  const isImage = item.mimeType?.startsWith("image/");
  const isVideo = item.mimeType?.startsWith("video/");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} title="Tutup (Esc)">
        ✕
      </button>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        {item.latestVersion && isImage && (
          <img src={mediaFileUrl(item.latestVersion.id)} alt={item.fileName} crossOrigin="anonymous" className="lightbox-media" />
        )}
        {item.latestVersion && isVideo && (
          <video
            src={mediaFileUrl(item.latestVersion.id)}
            controls
            autoPlay
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            className="lightbox-media"
          />
        )}
        <div className="lightbox-caption">{item.fileName}</div>
      </div>
    </div>
  );
}

export function MediaListPage() {
  const [items, setItems] = useState<MediaAssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaAssetSummary | null>(null);

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
        Klik gambar/video buat lihat penuh layar. Untuk approve/komentar/review, buka menu <strong>Review</strong>.
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
              onClick={() => setPreviewItem(m)}
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

      {previewItem && <MediaLightbox item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}