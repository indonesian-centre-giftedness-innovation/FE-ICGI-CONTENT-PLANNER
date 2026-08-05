import { useEffect, useState } from "react";
import { api, type PromptTemplate } from "../lib/api";

export function PromptTemplatesPage() {
  const [items, setItems] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [templateText, setTemplateText] = useState("");
  const [brandVoiceNotes, setBrandVoiceNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await api.listPromptTemplates());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat template");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTemplateText("");
    setBrandVoiceNotes("");
  }

  function startEdit(t: PromptTemplate) {
    setEditingId(t.id);
    setName(t.name);
    setTemplateText(t.templateText);
    setBrandVoiceNotes(t.brandVoiceNotes || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !templateText.trim()) {
      setError("Nama dan isi template wajib diisi");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updatePromptTemplate(editingId, {
          name: name.trim(),
          templateText: templateText.trim(),
          brandVoiceNotes: brandVoiceNotes.trim(),
        });
      } else {
        await api.createPromptTemplate({
          name: name.trim(),
          templateText: templateText.trim(),
          brandVoiceNotes: brandVoiceNotes.trim() || undefined,
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan template");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(t: PromptTemplate) {
    try {
      await api.updatePromptTemplate(t.id, { isActive: !t.isActive });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status template");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus template ini?")) return;
    try {
      await api.deletePromptTemplate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus template");
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <span className="eyebrow">Redaksi</span>
      <h1>Prompt Templates</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Brand voice/gaya penulisan yang bisa dipilih tim saat generate draft pakai AI. Semua orang bisa buat/edit template.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed" style={{ marginBottom: 20 }}>
          Belum ada template. Buat dari form di bawah.
        </div>
      )}

      <div className="stack" style={{ marginBottom: 24 }}>
        {items.map((t) => (
          <div key={t.id} className="panel" style={{ opacity: t.isActive ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <strong>{t.name}</strong>
              <div className="btn-row">
                <span className="stamp" style={{ fontSize: 10, color: t.isActive ? "var(--green)" : "#8a8a8f" }}>
                  {t.isActive ? "Aktif" : "Nonaktif"}
                </span>
                <button onClick={() => startEdit(t)} className="btn btn--sm">
                  Edit
                </button>
                <button onClick={() => handleToggleActive(t)} className="btn btn--sm">
                  {t.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button onClick={() => handleDelete(t.id)} className="btn btn--sm btn--danger">
                  Hapus
                </button>
              </div>
            </div>
            <p style={{ fontSize: 13, whiteSpace: "pre-wrap", marginTop: 8 }}>{t.templateText}</p>
            {t.brandVoiceNotes && (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Catatan: {t.brandVoiceNotes}
              </p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="panel panel--dashed">
        <span className="eyebrow">{editingId ? "Edit template" : "Buat template baru"}</span>

        <label className="field">
          <span className="field__label">Nama</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Misal: Brand Voice Instagram — Playful"
            className="input"
          />
        </label>

        <label className="field">
          <span className="field__label">Isi template (gaya/instruksi menulis)</span>
          <textarea
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            rows={5}
            className="textarea"
            placeholder="Misal: Tulis dengan nada santai, banyak emoji, sapaan 'kamu', kalimat pendek-pendek..."
          />
        </label>

        <label className="field">
          <span className="field__label">Catatan brand voice tambahan (opsional)</span>
          <textarea
            value={brandVoiceNotes}
            onChange={(e) => setBrandVoiceNotes(e.target.value)}
            rows={3}
            className="textarea"
          />
        </label>

        <div className="btn-row">
          <button type="submit" disabled={isSaving} className="btn btn--primary">
            {isSaving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "+ Buat Template"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn btn--ghost">
              Batal Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}