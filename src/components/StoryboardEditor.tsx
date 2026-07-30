import { useState } from "react";
import { api, storyboardSketchUrl, type Storyboard } from "../lib/api";
import { SketchTemplateGallery } from "./SketchTemplateGallery";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "./UploadProgressBar";

export function StoryboardEditor({
  storyboard,
  onChanged,
}: {
  storyboard: Storyboard;
  onChanged: () => void;
}) {
  const confirmDialog = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("3");
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingSketchId, setUploadingSketchId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);

  async function handleUploadSketch(sceneId: string, file: File) {
    setUploadingSketchId(sceneId);
    setUploadProgress(0);
    setError(null);
    try {
      await api.uploadSceneSketch(sceneId, file, setUploadProgress);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload sketsa");
    } finally {
      setUploadingSketchId(null);
      setUploadProgress(null);
    }
  }

  async function handleDropTemplate(sceneId: string, templateId: string) {
    setDragOverSceneId(null);
    setError(null);
    try {
      await api.applySketchTemplateToScene(sceneId, templateId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menerapkan template sketsa");
    }
  }

  async function handleAddScene(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    setError(null);
    try {
      await api.addScene(storyboard.id, {
        description: description.trim() || undefined,
        durationSeconds: Number(duration) || 0,
      });
      setDescription("");
      setDuration("3");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah scene");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateScene(sceneId: string, field: "description" | "durationSeconds", value: string) {
    try {
      await api.updateScene(sceneId, {
        [field]: field === "durationSeconds" ? Number(value) || 0 : value,
      } as any);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan perubahan scene");
    }
  }

  async function handleMove(sceneId: string, direction: "up" | "down") {
    try {
      await api.moveScene(sceneId, direction);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah urutan");
    }
  }

  async function handleDeleteScene(sceneId: string) {
    if (!(await confirmDialog("Hapus scene ini?"))) return;
    try {
      await api.deleteScene(sceneId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus scene");
    }
  }

  const totalDuration = storyboard.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  return (
    <div className="storyboard-layout">
      <div className="storyboard-layout__main">
        {error && <p className="callout callout--error">{error}</p>}

        <div className="btn-row" style={{ marginBottom: 16, alignItems: "center" }}>
          <span className="badge-count">{storyboard.scenes.length} SCENE</span>
          <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>
            Total durasi: {totalDuration} detik
          </span>
        </div>

        {storyboard.scenes.length === 0 && (
          <p className="text-muted" style={{ marginBottom: 16 }}>
            Belum ada scene. Tambahkan di bawah.
          </p>
        )}

        <div className="stack" style={{ marginBottom: 24 }}>
          {storyboard.scenes.map((scene, idx) => (
            <div key={scene.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    background: "var(--yellow)",
                    border: "3px solid var(--ink)",
                    borderRadius: 4,
                    padding: "2px 10px",
                  }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="btn-row">
                  <button onClick={() => handleMove(scene.id, "up")} disabled={idx === 0} className="btn btn--sm">
                    ↑
                  </button>
                  <button
                    onClick={() => handleMove(scene.id, "down")}
                    disabled={idx === storyboard.scenes.length - 1}
                    className="btn btn--sm"
                  >
                    ↓
                  </button>
                  <button onClick={() => handleDeleteScene(scene.id)} className="btn btn--sm btn--danger">
                    Hapus
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* kotak sketsa — ukuran konsisten & jadi target drag-drop dari library */}
                <div
                  className={`scene-sketch-box${dragOverSceneId === scene.id ? " scene-sketch-box--dragover" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSceneId(scene.id);
                  }}
                  onDragLeave={() => setDragOverSceneId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const templateId = e.dataTransfer.getData("text/plain");
                    if (templateId) handleDropTemplate(scene.id, templateId);
                  }}
                >
                  {scene.sketchImageGdriveId ? (
                    <img src={storyboardSketchUrl(scene.id)} alt="Sketsa scene" />
                  ) : (
                    <span className="scene-sketch-box__placeholder">
                      Drag sketsa dari library, atau upload manual
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="field">
                    <span className="field__label">Deskripsi</span>
                    <textarea
                      defaultValue={scene.description ?? ""}
                      rows={2}
                      className="textarea"
                      onBlur={(e) => handleUpdateScene(scene.id, "description", e.target.value)}
                    />
                  </label>

                  <label className="field" style={{ marginBottom: 8, maxWidth: 160 }}>
                    <span className="field__label">Durasi (detik)</span>
                    <input
                      type="number"
                      defaultValue={scene.durationSeconds}
                      className="input"
                      onBlur={(e) => handleUpdateScene(scene.id, "durationSeconds", e.target.value)}
                    />
                  </label>

                  <label className="btn btn--sm" style={{ cursor: "pointer" }}>
                    {uploadingSketchId === scene.id
                      ? "Mengunggah..."
                      : scene.sketchImageGdriveId
                      ? "Ganti Sketsa"
                      : "Upload Sketsa Manual"}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingSketchId === scene.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadSketch(scene.id, file);
                        e.target.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {uploadingSketchId === scene.id && uploadProgress !== null && (
                    <UploadProgressBar percent={uploadProgress} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddScene} className="panel panel--dashed">
          <span className="eyebrow">Tambah scene baru</span>
          <label className="field">
            <span className="field__label">Deskripsi</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="textarea"
            />
          </label>
          <label className="field" style={{ marginBottom: 12, maxWidth: 160 }}>
            <span className="field__label">Durasi (detik)</span>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="input"
            />
          </label>
          <button type="submit" disabled={isAdding} className="btn btn--primary">
            {isAdding ? "Menambah..." : "+ Tambah Scene"}
          </button>
        </form>
      </div>

      <SketchTemplateGallery />
    </div>
  );
}