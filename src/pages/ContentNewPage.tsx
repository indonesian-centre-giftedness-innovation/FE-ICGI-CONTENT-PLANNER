import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, type ContentPillar } from "../lib/api";
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
          <span className="field__label">Platform (opsional)</span>
          <PlatformPicker value={platform} onChange={setPlatform} />
        </div>

        <div className="btn-row" style={{ marginBottom: 14, marginTop: 14 }}>
          <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
            <span className="field__label">Pillar (opsional)</span>
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
          <span className="field__label">Draft awal (opsional, bisa di-generate AI nanti)</span>
          <textarea
            value={bodyDraft}
            onChange={(e) => setBodyDraft(e.target.value)}
            rows={6}
            className="textarea"
          />
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