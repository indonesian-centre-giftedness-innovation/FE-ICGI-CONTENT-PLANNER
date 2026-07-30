import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type MediaAsset } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { MediaAssetCard } from "../components/MediaAssetCard";
import { UploadProgressBar } from "../components/UploadProgressBar";

export function MediaReviewPage() {
  const { id: contentId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isLeadAdmin = user?.role === "lead_admin";

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  async function load() {
    if (!contentId) return;
    setIsLoading(true);
    setError(null);
    try {
      setAssets(await api.listMediaForContent(contentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat media");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  async function handleUploadNew(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !contentId) return;
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      await api.uploadNewMedia(contentId, file, setUploadProgress);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload media");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  if (isLoading) return <p className="text-muted">Memuat...</p>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to={`/content/${contentId}/edit`}>&larr; Kembali ke draft konten</Link>
      </p>
      <span className="eyebrow">Ruang Review</span>
      <h1>Media & Review</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Upload poster/video di sini, beri komentar langsung di gambar/video — pengganti review
        lewat WhatsApp.
      </p>

      {error && <p className="callout callout--error">{error}</p>}

      <div className="panel panel--dashed" style={{ marginBottom: 24 }}>
        <span className="field__label">Upload media baru (poster/video)</span>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={handleUploadNew}
          disabled={isUploading}
          style={{ display: "block", marginTop: 6 }}
        />
        {uploadProgress !== null && <UploadProgressBar percent={uploadProgress} />}
      </div>

      {assets.length === 0 && (
        <div className="empty-state panel panel--dashed">Belum ada media diunggah untuk konten ini.</div>
      )}

      <div className="stack" style={{ gap: 24 }}>
        {assets.map((asset) => (
          <MediaAssetCard key={asset.id} asset={asset} isLeadAdmin={isLeadAdmin} onChanged={load} />
        ))}
      </div>
    </div>
  );
}