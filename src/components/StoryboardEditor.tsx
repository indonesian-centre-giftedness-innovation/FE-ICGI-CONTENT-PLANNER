import { useEffect, useState } from "react";
import { api, storyboardSketchUrl, sketchTemplateImageUrl, type Storyboard, type SketchTemplate } from "../lib/api";
import { SketchTemplateGallery } from "./SketchTemplateGallery";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "./UploadProgressBar";

/** Panel yang bisa ditutup/dibuka — di layar lebar tampil sebagai card biasa,
 * di HP jadi tombol mengambang yang membuka bottom-sheet saat diketuk. */
function FloatingPanel({
  icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`floating-panel ${isOpen ? "floating-panel--open" : "floating-panel--closed"}`}
      onClick={isOpen ? onToggle : undefined}
    >
      <div className="floating-panel__inner panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="floating-panel__toggle" onClick={onToggle}>
          <span>
            {icon} {title}
          </span>
          <span className="floating-panel__chevron">{isOpen ? "✕" : "▸"}</span>
        </button>
        {isOpen && <div className="floating-panel__body">{children}</div>}
      </div>
    </div>
  );
}

/** Modal pilih sumber sketsa/footage untuk 1 scene — dari template tersedia, atau upload sendiri. */
function TemplatePickerModal({
  onClose,
  onPickTemplate,
  onUploadFile,
  isUploading,
  uploadProgress,
}: {
  onClose: () => void;
  onPickTemplate: (templateId: string) => void;
  onUploadFile: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number | null;
}) {
  const [templates, setTemplates] = useState<SketchTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .listSketchTemplates()
      .then(setTemplates)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="panel picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="btn-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            Pilih Template / Footage
          </span>
          <button type="button" onClick={onClose} className="btn btn--sm">
            ✕ Tutup
          </button>
        </div>

        <span className="field__label">Dari template tersedia</span>
        {isLoading && <p className="text-muted" style={{ fontSize: 12 }}>Memuat...</p>}
        {!isLoading && templates.length === 0 && (
          <p className="text-muted" style={{ fontSize: 12 }}>Belum ada template sketsa.</p>
        )}
        <div className="picker-modal__grid">
          {templates.map((t) => (
            <button
              type="button"
              key={t.id}
              className="picker-modal__item"
              onClick={() => onPickTemplate(t.id)}
              title={t.name}
            >
              <img src={sketchTemplateImageUrl(t.id)} alt={t.name} crossOrigin="anonymous" />
              <span>{t.name}</span>
            </button>
          ))}
        </div>

        <div className="picker-modal__divider">atau</div>

        <span className="field__label">Upload dari perangkat</span>
        <label className="btn btn--primary" style={{ width: "100%", cursor: "pointer", justifyContent: "center" }}>
          {isUploading ? "Mengunggah..." : "📁 Pilih File dari HP/Komputer"}
          <input
            type="file"
            accept="image/*"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
            }}
            style={{ display: "none" }}
          />
        </label>
        {uploadProgress !== null && <UploadProgressBar percent={uploadProgress} />}
      </div>
    </div>
  );
}

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
  const [pickerSceneId, setPickerSceneId] = useState<string | null>(null);

  const [isDraftOpen, setIsDraftOpen] = useState(true);
  const [isScriptOpen, setIsScriptOpen] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  async function handleUploadSketch(sceneId: string, file: File) {
    setUploadingSketchId(sceneId);
    setUploadProgress(0);
    setError(null);
    try {
      await api.uploadSceneSketch(sceneId, file, setUploadProgress);
      onChanged();
      setPickerSceneId(null);
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
      setPickerSceneId(null);
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
  const hasDraftPanel = draftPreviewText !== undefined && draftPreviewText !== null && draftPreviewText.trim() !== "";

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
                {/* kotak sketsa — ukuran konsisten & tetap jadi target drag-drop dari library (desktop) */}
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
                        {readOnly ? "Belum ada sketsa" : "Drag sketsa dari library, atau pakai tombol di bawah"}
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
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => setPickerSceneId(scene.id)}
                      disabled={uploadingSketchId === scene.id}
                      className="btn btn--sm"
                      style={{ width: 220, marginTop: 6 }}
                    >
                      {uploadingSketchId === scene.id
                        ? "Mengunggah..."
                        : scene.sketchImageGdriveId
                        ? "🖼️ Ganti Template/Footage"
                        : "🖼️ Masukkan Template/Footage"}
                    </button>
                  )}
                  {uploadingSketchId === scene.id && uploadProgress !== null && (
                    <div style={{ width: 220 }}>
                      <UploadProgressBar percent={uploadProgress} />
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
        <div className="floating-panel-group">
          {hasDraftPanel && (
            <FloatingPanel icon="📄" title="Draft Konten" isOpen={isDraftOpen} onToggle={() => setIsDraftOpen((v) => !v)}>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 0 }}>
                Salin bagian yang relevan ke kolom Dialog di scene.
              </p>
              <div className="draft-preview-panel__body">{draftPreviewText}</div>
              <button type="button" onClick={handleCopyDraft} className="btn btn--sm" style={{ width: "100%" }}>
                {copyStatus || "📋 Salin Semua Teks"}
              </button>
            </FloatingPanel>
          )}

          {manualScriptVisible && (
            <FloatingPanel icon="📝" title="Script" isOpen={isScriptOpen} onToggle={() => setIsScriptOpen((v) => !v)}>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 0 }}>
                Tempel naskah/script kamu di sini sebagai referensi saat mengisi Deskripsi &amp; Dialog tiap scene.
              </p>
              <textarea
                value={manualScriptText ?? ""}
                onChange={(e) => onManualScriptChange?.(e.target.value)}
                className="textarea draft-manual-textarea"
                placeholder="Tempel naskah/script di sini..."
              />
            </FloatingPanel>
          )}

          <FloatingPanel icon="🖼️" title="Library Sketsa" isOpen={isLibraryOpen} onToggle={() => setIsLibraryOpen((v) => !v)}>
            <SketchTemplateGallery />
          </FloatingPanel>
        </div>
      </div>

      {pickerSceneId && (
        <TemplatePickerModal
          onClose={() => setPickerSceneId(null)}
          onPickTemplate={(templateId) => handleDropTemplate(pickerSceneId, templateId)}
          onUploadFile={(file) => handleUploadSketch(pickerSceneId, file)}
          isUploading={uploadingSketchId === pickerSceneId}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
}