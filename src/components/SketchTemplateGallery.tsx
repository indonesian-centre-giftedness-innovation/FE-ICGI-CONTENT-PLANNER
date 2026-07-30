import { useEffect, useState } from "react";
import { api, sketchTemplateImageUrl, type SketchTemplate } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "./UploadProgressBar";

export function SketchTemplateGallery() {
  const confirmDialog = useConfirm();
  const [templates, setTemplates] = useState<SketchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setTemplates(await api.listSketchTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat template sketsa");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newFile) {
      setError("Nama/angle shoot dan file wajib diisi");
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      await api.uploadSketchTemplate(newName.trim(), newFile, setUploadProgress);
      setNewName("");
      setNewFile(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload template");
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmDialog("Hapus template sketsa ini?"))) return;
    setDeletingId(id);
    try {
      await api.deleteSketchTemplate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus template");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel sketch-gallery">
      <span className="eyebrow">Library Sketsa</span>
      <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 10 }}>
        Drag salah satu ke kotak sketsa di scene untuk pakai.
      </p>

      {error && <p className="callout callout--error" style={{ fontSize: 12 }}>{error}</p>}
      {isLoading && <p className="text-muted" style={{ fontSize: 12 }}>Memuat...</p>}

      {!isLoading && templates.length === 0 && (
        <p className="text-muted" style={{ fontSize: 12 }}>Belum ada template sketsa.</p>
      )}

      <div className="sketch-gallery__grid">
        {templates.map((t) => (
          <div
            key={t.id}
            className="sketch-gallery__item"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", t.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            title="Drag ke kotak sketsa scene"
          >
            <img src={sketchTemplateImageUrl(t.id)} alt={t.name} draggable={false} />
            <span className="sketch-gallery__item-name">{t.name}</span>
            <button
              type="button"
              onClick={() => handleDelete(t.id)}
              className="sketch-gallery__item-delete"
              title="Hapus template"
              disabled={deletingId === t.id}
              style={deletingId === t.id ? { opacity: 0.5 } : undefined}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleUpload} className="sketch-gallery__upload">
        <input
          type="text"
          placeholder="Nama / angle shoot (mis. Close-up)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input"
          style={{ marginBottom: 6 }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewFile(e.target.files?.[0] || null)}
          style={{ marginBottom: 6, fontSize: 12 }}
        />
        {uploadProgress !== null && <UploadProgressBar percent={uploadProgress} />}
        <button type="submit" disabled={isUploading} className="btn btn--sm btn--primary" style={{ width: "100%", marginTop: 6 }}>
          {isUploading ? "Mengunggah..." : "+ Tambah Template"}
        </button>
      </form>
    </div>
  );
}