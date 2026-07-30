import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type MediaAsset } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { MediaAssetCard } from "../components/MediaAssetCard";
import { UploadProgressBar } from "../components/UploadProgressBar";

export function MediaStandalonePage() {
  const { user } = useAuth();
  const isLeadAdmin = user?.role === "lead_admin";

  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setAssets(await api.listStandaloneMedia());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat media");
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
    setError(null);
    try {
      await api.uploadStandaloneMedia(file, setUploadProgress);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload media");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to="/media">&larr; Kembali ke daftar media</Link>
      </p>
      <span className="eyebrow">Ruang Review · Standalone</span>
      <h1>Media Tanpa Draft</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Media yang tidak terikat draft konten mana pun — cocok untuk aset umum (logo, template,
        stok foto) yang tetap perlu direview tim.
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

      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && assets.length === 0 && (
        <div className="empty-state panel panel--dashed">Belum ada media standalone diunggah.</div>
      )}

      <div className="stack" style={{ gap: 24 }}>
        {assets.map((asset) => (
          <MediaAssetCard key={asset.id} asset={asset} isLeadAdmin={isLeadAdmin} onChanged={load} />
        ))}
      </div>
    </div>
  );
}