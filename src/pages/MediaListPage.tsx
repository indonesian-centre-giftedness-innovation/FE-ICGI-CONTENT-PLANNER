import { useEffect, useRef, useState } from "react";
import { api, mediaFileUrl, type MediaAssetSummary } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "../components/UploadProgressBar";

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
  const { user } = useAuth();
  const confirmDialog = useConfirm();
  const [items, setItems] = useState<MediaAssetSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaAssetSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      setItems(await api.listAllMedia());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUploadNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    try {
      await api.uploadStandaloneMedia(file, setUploadProgress);
      await load(); // tetap di halaman ini, langsung balik ke grid — tidak pindah halaman
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Gagal upload media");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

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

  async function handleDelete(e: React.MouseEvent, item: MediaAssetSummary) {
    e.stopPropagation();
    if (!(await confirmDialog(`Hapus media "${item.fileName}"? Tindakan ini tidak bisa dibatalkan.`))) return;
    setDeletingId(item.id);
    try {
      await api.deleteMediaAsset(item.id);
      setItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus media");
    } finally {
      setDeletingId(null);
    }
  }

  function canDelete(item: MediaAssetSummary) {
    return user?.role === "lead_admin" || item.uploadedBy === user?.userId;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 0 }}>Media</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="btn btn--primary">
            {isUploading ? "Mengunggah..." : "+ Media Baru (tanpa draft)"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleUploadNew}
            disabled={isUploading}
            style={{ display: "none" }}
          />
          {uploadProgress !== null && (
            <div style={{ marginTop: 8, maxWidth: 220 }}>
              <UploadProgressBar percent={uploadProgress} />
            </div>
          )}
        </div>
      </div>
      {uploadError && (
        <p className="callout callout--error" style={{ marginBottom: 12 }}>
          {uploadError}
        </p>
      )}
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
              <div className="media-grid__actions">
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
                {canDelete(m) && (
                  <button
                    onClick={(e) => handleDelete(e, m)}
                    disabled={deletingId === m.id}
                    className="media-grid__delete"
                    title="Hapus media"
                  >
                    {deletingId === m.id ? "…" : "✕"}
                  </button>
                )}
              </div>
              <div className="media-grid__caption">{m.fileName}</div>
            </div>
          ))}
        </div>
      )}

      {previewItem && <MediaLightbox item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}