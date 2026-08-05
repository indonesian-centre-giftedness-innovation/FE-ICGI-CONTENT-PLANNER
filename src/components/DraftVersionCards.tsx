import { useEffect, useRef, useState } from "react";
import { api, type ContentPillar, type PromptTemplate } from "../lib/api";

type DraftVersion = {
  id: string;
  label: string;
  text: string;
};

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now()}-${Math.random()}`;
}

/** Textarea yang tingginya otomatis mengikuti isi — tidak pernah scroll internal. */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function resize(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(80, el.scrollHeight)}px`;
  }

  useEffect(() => {
    resize(ref.current);
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        resize(e.target);
      }}
      placeholder={placeholder}
      className={className}
      rows={3}
      style={{ resize: "none", overflow: "hidden" }}
    />
  );
}

/**
 * Panel draft + generate AI, dipakai di form Draft Konten (baru maupun edit).
 * - Draft awal (manual) & tiap hasil generate AI tampil sebagai "kartu versi" terpisah,
 *   auto-tinggi (tidak scroll), tidak saling menimpa — semua tetap kelihatan sekaligus.
 * - User pilih kartu mana yang mau dipakai jadi draft final lewat tombol "Gunakan draft ini".
 * - Bisa tambah kartu kosong buat ditulis manual sendiri.
 * - Dua perintah AI terpisah: (1) bikin draft BARU jadi kartu baru, (2) EDIT kartu draft
 *   yang lagi aktif — teks kartu itu sendiri dipakai sebagai konteks/"memori" tiap perintah
 *   lanjutan, jadi bisa diperbaiki berulang kali.
 */
export function DraftVersionCards({
  title,
  platforms,
  pillar,
  value,
  onChange,
}: {
  title: string;
  platforms: string[];
  pillar: ContentPillar | "";
  value: string;
  onChange: (text: string) => void;
}) {
  const [versions, setVersions] = useState<DraftVersion[]>(() =>
    value.trim()
      ? [{ id: "seed", label: "Draft saat ini", text: value }]
      : [{ id: "seed", label: "Draft Manual 1", text: "" }]
  );
  const [activeId, setActiveId] = useState<string>("seed");
  const manualCountRef = useRef(1);
  const aiCountRef = useRef(0);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const [newInstructions, setNewInstructions] = useState("");
  const [isGeneratingNew, setIsGeneratingNew] = useState(false);

  const [editInstructions, setEditInstructions] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPromptTemplates()
      .then((all) => setTemplates(all.filter((t) => t.isActive)))
      .catch(() => {});
  }, []);

  function updateVersionText(id: string, text: string) {
    setVersions((vs) => vs.map((v) => (v.id === id ? { ...v, text } : v)));
    if (id === activeId) onChange(text);
  }

  function selectVersion(id: string, text: string) {
    setActiveId(id);
    onChange(text);
  }

  function addManualCard() {
    manualCountRef.current += 1;
    const v: DraftVersion = { id: newId(), label: `Draft Manual ${manualCountRef.current}`, text: "" };
    setVersions((vs) => [...vs, v]);
  }

  function removeCard(id: string) {
    setVersions((vs) => {
      if (vs.length <= 1) return vs; // minimal 1 kartu harus tetap ada
      const next = vs.filter((v) => v.id !== id);
      if (id === activeId) {
        setActiveId(next[0].id);
        onChange(next[0].text);
      }
      return next;
    });
  }

  // Perintah 1: bikin draft BARU (hasilnya jadi kartu terpisah, tidak menimpa yang lain)
  async function handleGenerateNew() {
    setIsGeneratingNew(true);
    setError(null);
    setNotice(null);
    try {
      const { text } = await api.generateDraftAi({
        title: title.trim() || undefined,
        platforms: platforms.length ? platforms : undefined,
        pillar: pillar || undefined,
        promptTemplateId: selectedTemplateId || undefined,
        instructions: newInstructions.trim() || undefined,
      });
      aiCountRef.current += 1;
      const v: DraftVersion = { id: newId(), label: `Hasil AI ${aiCountRef.current}`, text };
      setVersions((vs) => [...vs, v]);
      setNotice('Draft AI baru ditambahkan di bawah — klik "Gunakan draft ini" kalau mau pakai.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate lewat AI");
    } finally {
      setIsGeneratingNew(false);
    }
  }

  // Perintah 2: EDIT kartu draft yang lagi aktif — teks kartu itu sendiri jadi konteks/memori,
  // jadi bisa dikasih perintah lanjutan berkali-kali ("buat lebih singkat", lalu "tambah CTA", dst)
  async function handleEditActive() {
    const active = versions.find((v) => v.id === activeId);
    if (!active || !editInstructions.trim()) return;
    setIsEditing(true);
    setError(null);
    setNotice(null);
    try {
      const { text } = await api.generateDraftAi({
        title: title.trim() || undefined,
        platforms: platforms.length ? platforms : undefined,
        pillar: pillar || undefined,
        promptTemplateId: selectedTemplateId || undefined,
        bodyDraft: active.text.trim() || undefined,
        instructions: editInstructions.trim(),
      });
      updateVersionText(active.id, text);
      setEditInstructions("");
      setNotice(`Kartu "${active.label}" diperbarui sesuai perintah kamu.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal edit lewat AI");
    } finally {
      setIsEditing(false);
    }
  }

  const activeCard = versions.find((v) => v.id === activeId);

  return (
    <div>
      <label className="field">
        <span className="field__label">Brand voice template (opsional)</span>
        <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="select">
          <option value="">Tanpa brand voice template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      <div className="ai-command-grid">
        <div className="panel panel--flat ai-command-card">
          <span className="eyebrow">Buat draft baru</span>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 8 }}>
            Hasilnya jadi kartu baru di bawah, kartu lain tidak berubah.
          </p>
          <textarea
            value={newInstructions}
            onChange={(e) => setNewInstructions(e.target.value)}
            rows={2}
            className="textarea"
            placeholder="Misal: buat draft promo akhir bulan, nada santai..."
            style={{ marginBottom: 8 }}
          />
          <button type="button" onClick={handleGenerateNew} disabled={isGeneratingNew} className="btn btn--blue" style={{ width: "100%" }}>
            {isGeneratingNew ? "Generating..." : "✨ Generate Draft Baru"}
          </button>
        </div>

        <div className="panel panel--flat ai-command-card">
          <span className="eyebrow">Edit draft aktif</span>
          <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 8 }}>
            AI mengingat isi kartu <strong>"{activeCard?.label}"</strong> — perintah lanjutan akan mengedit kartu itu langsung (bisa berkali-kali).
          </p>
          <textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            rows={2}
            className="textarea"
            placeholder="Misal: buat lebih singkat, tambahkan call-to-action..."
            style={{ marginBottom: 8 }}
          />
          <button
            type="button"
            onClick={handleEditActive}
            disabled={isEditing || !editInstructions.trim()}
            className="btn btn--blue"
            style={{ width: "100%" }}
          >
            {isEditing ? "Mengedit..." : "🖊️ Edit dengan AI"}
          </button>
        </div>
      </div>

      <div className="btn-row" style={{ margin: "14px 0" }}>
        <button type="button" onClick={addManualCard} className="btn btn--sm">
          + Tambah Draft Manual
        </button>
      </div>

      {error && <p className="callout callout--error">{error}</p>}
      {notice && <p className="callout callout--success">{notice}</p>}

      <div className="stack stack--sm">
        {versions.map((v) => {
          const isActive = v.id === activeId;
          return (
            <div
              key={v.id}
              className="panel panel--flat draft-version-card"
              style={{
                background: isActive ? "var(--paper-alt)" : "var(--paper)",
                borderColor: isActive ? "var(--blue)" : undefined,
                borderWidth: isActive ? 3 : undefined,
              }}
            >
              <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="field__label" style={{ marginBottom: 0 }}>
                  {v.label} {isActive && <span style={{ color: "var(--blue)" }}>· draft aktif</span>}
                </span>
                <div className="btn-row" style={{ gap: 6 }}>
                  {!isActive && (
                    <button type="button" onClick={() => selectVersion(v.id, v.text)} className="btn btn--sm">
                      Gunakan draft ini
                    </button>
                  )}
                  {versions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCard(v.id)}
                      className="btn btn--sm btn--danger"
                      title="Hapus kartu ini"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <AutoGrowTextarea
                value={v.text}
                onChange={(text) => updateVersionText(v.id, text)}
                className="textarea"
                placeholder="Tulis draft di sini..."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}