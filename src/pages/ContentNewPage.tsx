import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type ContentPillar, type PromptTemplate } from "../lib/api";
import { PILLAR_LABEL } from "../components/PillarFunnelBadge";
import { PlatformPicker } from "../components/PlatformPicker";

export function ContentNewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get("date"); // dari klik tanggal kosong di kalender

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [pillar, setPillar] = useState<ContentPillar | "">("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPromptTemplates()
      .then((all) => setTemplates(all.filter((t) => t.isActive)))
      .catch(() => {});
  }, []);

  async function handleGenerateAi() {
    setIsGenerating(true);
    setError(null);
    setAiNotice(null);
    try {
      const { text } = await api.generateDraftAi({
        title: title.trim() || undefined,
        platform: platform || undefined,
        promptTemplateId: selectedTemplateId || undefined,
        bodyDraft: bodyDraft.trim() || undefined,
      });
      setBodyDraft(text);
      setAiNotice("✨ Draft AI berhasil dibuat — silakan diedit lagi kalau perlu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate lewat AI");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul wajib diisi");
      return;
    }

    setIsSaving(true);
    try {
      const created = await api.createContent({
        title: title.trim(),
        platform: platform || undefined,
        pillar: pillar || undefined,
        bodyDraft: bodyDraft.trim() || undefined,
      });

      // kalau dibuat dari klik tanggal kosong di kalender, langsung jadwalkan ke tanggal itu
      if (prefillDate) {
        await api
          .createCalendarItem({
            contentId: created.id,
            scheduledDate: new Date(`${prefillDate}T09:00:00`).toISOString(),
            platform: platform || undefined,
          })
          .catch(() => {});
      }

      navigate(`/content/${created.id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat draft");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <span className="eyebrow">Langkah 1 — Ide & Draft</span>
      <h1>Draft Konten Baru</h1>
      {prefillDate && (
        <p className="callout" style={{ marginBottom: 16 }}>
          Draft ini akan otomatis dijadwalkan tayang tanggal{" "}
          <strong>{new Date(prefillDate).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong>.
        </p>
      )}

      <form onSubmit={handleSubmit} className="panel">
        <label className="field">
          <span className="field__label">Judul</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misal: Promo Ramadhan 2026"
            className="input"
          />
        </label>

        <div className="field">
          <span className="field__label">Platform</span>
          <PlatformPicker value={platform} onChange={setPlatform} />
        </div>

        <div className="btn-row" style={{ marginBottom: 14, marginTop: 14 }}>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <span className="field__label">Pillar</span>
            <select
              value={pillar}
              onChange={(e) => setPillar(e.target.value as ContentPillar | "")}
              className="select"
            >
              <option value="">- Pilih pillar -</option>
              {Object.entries(PILLAR_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

        </div>

        <label className="field">
          <span className="field__label">Brand voice template</span>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="select"
          >
            <option value="">Tanpa brand voice template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span className="field__label" style={{ marginBottom: 0 }}>
              Draft
            </span>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating}
              className="btn btn--sm btn--blue"
            >
              {isGenerating ? "Generating..." : "✨ Generate AI"}
            </button>
          </div>
          <textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            rows={6}
            className="textarea"
            placeholder="Tulis ide/arahan singkat di sini, lalu klik Generate AI kalau mau dikembangkan otomatis — atau tulis draft lengkap sendiri."
          />
          {aiNotice && (
            <p className="callout callout--success" style={{ marginTop: 8, fontSize: 12 }}>
              {aiNotice}
            </p>
          )}
        </label>

        {error && <p className="callout callout--error" style={{ marginBottom: 14 }}>{error}</p>}

        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan Draft"}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate("/dashboard")} disabled={isSaving}>
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}