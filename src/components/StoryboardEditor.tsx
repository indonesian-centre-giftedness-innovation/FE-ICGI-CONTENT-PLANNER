import { useState } from "react";
import { api, storyboardSketchUrl, type Storyboard } from "../lib/api";
import { SketchTemplateGallery } from "./SketchTemplateGallery";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "./UploadProgressBar";

export function StoryboardEditor({
  storyboard,
  onChanged,
  draftPreviewText,
  manualScriptVisible,
  manualScriptText,
  onManualScriptChange,
  readOnly,
}: {
  storyboard: Storyboard;
  onChanged: () => void;
  /** Draft/hasil AI dari konten yang terhubung — ditampilkan buat gampang copy-paste ke dialog scene. Kosongkan kalau storyboard standalone. */
  draftPreviewText?: string | null;
  /** Untuk storyboard standalone: tampilkan kotak script kosong yang bisa ditempel manual (toggle dari tombol "Script" di halaman). */
  manualScriptVisible?: boolean;
  manualScriptText?: string;
  onManualScriptChange?: (value: string) => void;
  /** Lead/Admin yang buka storyboard BUKAN buatan sendiri — cuma bisa lihat, semua kontrol edit disembunyikan. */
  readOnly?: boolean;
}) {
  const confirmDialog = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadingSketchId, setUploadingSketchId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [dragOverSceneId, setDragOverSceneId] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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

  async function handleAddScene() {
    setIsAdding(true);
    setError(null);
    try {
      await api.addScene(storyboard.id, { durationSeconds: 3 });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah scene");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleUpdateScene(sceneId: string, field: "description" | "dialogue" | "durationSeconds", value: string) {
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

  async function handleCopyDraft() {
    if (!draftPreviewText) return;
    try {
      await navigator.clipboard.writeText(draftPreviewText);
      setCopyStatus("Tersalin!");
    } catch {
      setCopyStatus("Gagal menyalin, salin manual saja");
    } finally {
      setTimeout(() => setCopyStatus(null), 2000);
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

        <div className="stack" style={{ marginBottom: 16 }}>
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
                  {!readOnly && (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {/* kotak sketsa — ukuran konsisten & jadi target drag-drop dari library */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    className={`scene-sketch-box${dragOverSceneId === scene.id ? " scene-sketch-box--dragover" : ""}`}
                    onDragOver={(e) => {
                      if (readOnly) return;
                      e.preventDefault();
                      setDragOverSceneId(scene.id);
                    }}
                    onDragLeave={() => setDragOverSceneId(null)}
                    onDrop={(e) => {
                      if (readOnly) return;
                      e.preventDefault();
                      const templateId = e.dataTransfer.getData("text/plain");
                      if (templateId) handleDropTemplate(scene.id, templateId);
                    }}
                  >
                    {scene.sketchImageGdriveId ? (
                      <img src={storyboardSketchUrl(scene.id)} alt="Sketsa scene" crossOrigin="anonymous" />
                    ) : (
                      <span className="scene-sketch-box__placeholder">
                        Drag sketsa dari library, atau upload manual
                      </span>
                    )}
                  </div>
                  {scene.sketchLabel && (
                    <div
                      style={{
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginTop: 4,
                        width: 220,
                      }}
                    >
                      {scene.sketchLabel}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <label className="field">
                    <span className="field__label">Deskripsi / Aksi</span>
                    <textarea
                      defaultValue={scene.description ?? ""}
                      className="textarea scene-textarea"
                      readOnly={readOnly}
                      onBlur={(e) => !readOnly && handleUpdateScene(scene.id, "description", e.target.value)}
                    />
                  </label>

                  <label className="field">
                    <span className="field__label">Dialog / Sound Notes</span>
                    <textarea
                      defaultValue={scene.dialogue ?? ""}
                      className="textarea scene-textarea"
                      readOnly={readOnly}
                      onBlur={(e) => !readOnly && handleUpdateScene(scene.id, "dialogue", e.target.value)}
                    />
                  </label>

                  <div className="btn-row" style={{ alignItems: "flex-end" }}>
                    <label className="field" style={{ marginBottom: 0, maxWidth: 140 }}>
                      <span className="field__label">Durasi (detik)</span>
                      <input
                        type="number"
                        defaultValue={scene.durationSeconds}
                        className="input"
                        readOnly={readOnly}
                        onBlur={(e) => !readOnly && handleUpdateScene(scene.id, "durationSeconds", e.target.value)}
                      />
                    </label>

                    {!readOnly && (
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
                    )}
                  </div>
                  {uploadingSketchId === scene.id && uploadProgress !== null && (
                    <UploadProgressBar percent={uploadProgress} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={handleAddScene}
            disabled={isAdding}
            className="btn btn--primary btn--add-scene"
          >
            {isAdding ? "Menambah..." : "+ Tambah Scene"}
          </button>
        )}
      </div>

      <div className="storyboard-layout__side">
        <div className="storyboard-layout__side-sticky">
          {draftPreviewText !== undefined && draftPreviewText !== null && draftPreviewText.trim() !== "" && (
            <div className="panel draft-preview-panel">
              <span className="eyebrow">Draft Konten (AI/Manual)</span>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 0 }}>
                Salin bagian yang relevan ke kolom Dialog di scene.
              </p>
              <div className="draft-preview-panel__body">{draftPreviewText}</div>
              <button type="button" onClick={handleCopyDraft} className="btn btn--sm" style={{ width: "100%" }}>
                {copyStatus || "📋 Salin Semua Teks"}
              </button>
            </div>
          )}

          {manualScriptVisible && (
            <div className="panel draft-preview-panel">
              <span className="eyebrow">Script</span>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 0 }}>
                Tempel naskah/script kamu di sini sebagai referensi saat mengisi Deskripsi &amp; Dialog tiap scene.
              </p>
              <textarea
                value={manualScriptText ?? ""}
                onChange={(e) => onManualScriptChange?.(e.target.value)}
                className="textarea draft-manual-textarea"
                placeholder="Tempel naskah/script di sini..."
              />
            </div>
          )}

          {!readOnly && <SketchTemplateGallery />}
        </div>
      </div>
    </div>
  );
}