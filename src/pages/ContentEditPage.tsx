import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, type Content, type ContentStatus, type Approval, type PromptTemplate, type ContentPillar, type ContentFunnel } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusStamp, STATUS_LABEL } from "../components/StatusStamp";
import { PILLAR_LABEL, FUNNEL_LABEL } from "../components/PillarFunnelBadge";
import { PlatformPicker } from "../components/PlatformPicker";
import { ContentTodoList } from "../components/ContentTodoList";
import { useConfirm } from "../context/ConfirmContext";

export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirmDialog = useConfirm();

  const [content, setContent] = useState<Content | null>(null);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [pillar, setPillar] = useState<ContentPillar | "">("");
  const [funnel, setFunnel] = useState<ContentFunnel | "">("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<Approval[]>([]);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isActing, setIsActing] = useState(false);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiReferenceFile, setAiReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageReferenceFile, setImageReferenceFile] = useState<File | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageGenNotice, setImageGenNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getContent(id)
      .then((data) => {
        setContent(data);
        setTitle(data.title);
        setPlatform(data.platform ?? "");
        setPillar(data.pillar ?? "");
        setFunnel(data.funnel ?? "");
        setBodyDraft(data.bodyDraft ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat konten"))
      .finally(() => setIsLoading(false));

    api.getApprovalHistory(id).then(setHistory).catch(() => {});
    api
      .listPromptTemplates()
      .then((all) => setTemplates(all.filter((t) => t.isActive)))
      .catch(() => {});
  }, [id]);

  async function handleGenerateAi() {
    if (!id) return;
    setIsGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.generateWithAi(id, {
        promptTemplateId: selectedTemplateId || undefined,
        instructions: aiInstructions.trim() || undefined,
        referenceFile: aiReferenceFile || undefined,
      });
      setContent(updated);
      setNotice("Draft AI berhasil digenerate. Cek hasilnya di bawah, lalu edit draft utama kalau perlu dipakai.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate lewat AI");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateImage() {
    if (!id || !imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setError(null);
    setImageGenNotice(null);
    try {
      await api.generateImageWithAi(id, {
        prompt: imagePrompt.trim(),
        referenceFile: imageReferenceFile || undefined,
      });
      setImageGenNotice("Gambar berhasil digenerate dan tersimpan di Media & Review, menunggu approve.");
      setImagePrompt("");
      setImageReferenceFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate gambar lewat AI");
    } finally {
      setIsGeneratingImage(false);
    }
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.updateContent(id, {
        title: title.trim(),
        platform: platform.trim(),
        pillar: pillar || null,
        funnel: funnel || null,
        bodyDraft,
      });
      setContent(updated);
      setNotice("Draft tersimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!(await confirmDialog("Hapus konten ini? Tindakan ini tidak bisa dibatalkan."))) return;
    try {
      await api.deleteContent(id);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  async function handleStatusChange(status: ContentStatus) {
    if (!id) return;
    setIsSaving(true);
    setError(null);
    try {
      const updated = await api.updateContent(id, { status });
      setContent(updated);
      setNotice(`Status diubah menjadi "${STATUS_LABEL[status]}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status");
    } finally {
      setIsSaving(false);
    }
  }

  async function refreshHistory() {
    if (!id) return;
    try {
      setHistory(await api.getApprovalHistory(id));
    } catch {
      // riwayat gagal dimuat, tidak fatal
    }
  }

  async function handleSubmitForReview() {
    if (!id) return;
    setIsActing(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.submitForReview(id);
      setContent(updated);
      setNotice(
        updated.status === "pending_review"
          ? "Konten disubmit dan menunggu review Lead/Admin."
          : "Konten langsung disetujui (dibuat oleh Lead/Admin)."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal submit untuk review");
    } finally {
      setIsActing(false);
    }
  }

  async function handleApprove() {
    if (!id) return;
    setIsActing(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.approveContent(id);
      setContent(updated);
      setNotice("Konten disetujui. Creator sudah diberi notifikasi.");
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal approve konten");
    } finally {
      setIsActing(false);
    }
  }

  async function handleRequestRevision() {
    if (!id) return;
    if (!revisionNotes.trim()) {
      setError("Catatan revisi wajib diisi sebelum meminta revisi.");
      return;
    }
    setIsActing(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.requestRevision(id, revisionNotes.trim());
      setContent(updated);
      setRevisionNotes("");
      setNotice("Permintaan revisi terkirim. Creator sudah diberi notifikasi.");
      await refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim permintaan revisi");
    } finally {
      setIsActing(false);
    }
  }

  async function handlePublish() {
    if (!id) return;
    setIsActing(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.publishContent(id);
      setContent(updated);
      setNotice("Konten ditandai tayang.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal publish konten");
    } finally {
      setIsActing(false);
    }
  }

  if (isLoading) return <p className="text-muted">Memuat...</p>;
  if (!content) return <p className="callout callout--error">{error || "Konten tidak ditemukan"}</p>;

  const isLeadAdmin = user?.role === "lead_admin";
  const isOwner = content.createdBy === user?.userId;

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to="/dashboard">&larr; Kembali ke dashboard</Link>
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ marginBottom: 0 }}>Edit Draft</h1>
        <StatusStamp status={content.status} />
      </div>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {content.requiresApproval ? "Konten ini perlu approval Lead/Admin sebelum tayang." : "Konten ini auto-publish (dibuat oleh Lead/Admin)."}
      </p>

      <div className="stack">
        <div className="panel">
          <label className="field">
            <span className="field__label">Judul</span>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
          </label>

          <div className="field">
            <span className="field__label">Platform</span>
            <PlatformPicker value={platform} onChange={setPlatform} />
          </div>

          <div className="btn-row" style={{ marginBottom: 14 }}>
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

            <label className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
              <span className="field__label">Funnel</span>
              <select
                value={funnel}
                onChange={(e) => setFunnel(e.target.value as ContentFunnel | "")}
                className="select"
              >
                <option value="">- Pilih funnel -</option>
                {Object.entries(FUNNEL_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field" style={{ marginBottom: 0 }}>
            <span className="field__label">Draft</span>
            <textarea value={bodyDraft} onChange={(e) => setBodyDraft(e.target.value)} rows={10} className="textarea" />
          </label>

          <div className="panel panel--flat" style={{ background: "var(--paper-alt)", marginTop: 16 }}>
            <span className="eyebrow">Generate dengan AI (Gemini)</span>
            <div className="btn-row" style={{ marginBottom: 10 }}>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="select"
                style={{ maxWidth: 280 }}
              >
                <option value="">Tanpa brand voice template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="field" style={{ marginBottom: 10 }}>
              <span className="field__label">Instruksi tambahan (opsional)</span>
              <textarea
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                rows={2}
                className="textarea"
                placeholder="Misal: buat lebih singkat, tambahkan call-to-action, fokus ke promo akhir bulan..."
              />
            </label>
            <label className="field" style={{ marginBottom: 10 }}>
              <span className="field__label">Lampirkan foto referensi (opsional)</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setAiReferenceFile(e.target.files?.[0] || null)}
                className="input"
              />
              {aiReferenceFile && (
                <span className="text-muted" style={{ fontSize: 12 }}>{aiReferenceFile.name}</span>
              )}
            </label>
            <button onClick={handleGenerateAi} disabled={isGenerating} className="btn btn--blue">
              {isGenerating ? "Generating..." : "✨ Generate Draft AI"}
            </button>
          </div>

          <div className="panel panel--flat" style={{ background: "var(--paper-alt)", marginTop: 12 }}>
            <span className="eyebrow">Generate Gambar dengan AI</span>
            <label className="field" style={{ marginBottom: 10 }}>
              <span className="field__label">Deskripsikan gambar yang mau dibuat</span>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={2}
                className="textarea"
                placeholder="Misal: poster promo diskon 50%, warna cerah, gaya flat design..."
              />
            </label>
            <label className="field" style={{ marginBottom: 10 }}>
              <span className="field__label">Gambar referensi/gaya (opsional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageReferenceFile(e.target.files?.[0] || null)}
                className="input"
              />
              {imageReferenceFile && (
                <span className="text-muted" style={{ fontSize: 12 }}>{imageReferenceFile.name}</span>
              )}
            </label>
            <button onClick={handleGenerateImage} disabled={isGeneratingImage || !imagePrompt.trim()} className="btn btn--blue">
              {isGeneratingImage ? "Generating..." : "🖼️ Generate Gambar"}
            </button>
            {imageGenNotice && (
              <p className="callout callout--success" style={{ marginTop: 10 }}>
                {imageGenNotice}{" "}
                <Link to={`/content/${id}/media`}>Buka Media & Review →</Link>
              </p>
            )}
            <p className="text-muted" style={{ fontSize: 11, marginTop: 8, marginBottom: 0 }}>
              Catatan: kuota generate gambar gratis lebih ketat dari generate teks. Kalau gagal,
              coba lagi beberapa saat lagi.
            </p>
          </div>

          {content.bodyAiGenerated && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="field__label" style={{ marginBottom: 0 }}>Hasil generate AI terakhir</span>
                <button
                  onClick={() => setBodyDraft(content.bodyAiGenerated || "")}
                  className="btn btn--sm"
                >
                  Pakai sebagai draft
                </button>
              </div>
              <div className="callout" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", fontSize: 13, marginTop: 6 }}>
                {content.bodyAiGenerated}
              </div>
            </div>
          )}

          {error && <p className="callout callout--error" style={{ marginTop: 14 }}>{error}</p>}
          {notice && <p className="callout callout--success" style={{ marginTop: 14 }}>{notice}</p>}

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button onClick={handleSave} disabled={isSaving} className="btn btn--primary">
              {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            <Link to={`/content/${id}/storyboard`} className="btn">
              Storyboard
            </Link>
            <Link to={`/content/${id}/calendar`} className="btn">
              Kalender & To-Do
            </Link>
            <Link to={`/content/${id}/media`} className="btn">
              Media & Review
            </Link>
            <button onClick={handleDelete} disabled={isSaving} className="btn btn--danger">
              Hapus
            </button>
          </div>
        </div>

        {id && <ContentTodoList contentId={id} />}

        {(isOwner || isLeadAdmin) && (content.status === "draft" || content.status === "revisi") && (
          <div className="panel">
            <span className="eyebrow">Langkah berikutnya</span>
            <button onClick={handleSubmitForReview} disabled={isActing} className="btn btn--blue">
              {isActing ? "Mengirim..." : "Submit untuk Review"}
            </button>
          </div>
        )}

        {isLeadAdmin && content.status === "pending_review" && (
          <div className="panel">
            <span className="eyebrow">Aksi Review (Lead/Admin)</span>
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button onClick={handleApprove} disabled={isActing} className="btn btn--green">
                ✓ Approve
              </button>
            </div>
            <label className="field" style={{ marginBottom: 8 }}>
              <span className="field__label">Catatan revisi (wajib diisi untuk minta revisi)</span>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={2}
                className="textarea"
              />
            </label>
            <button onClick={handleRequestRevision} disabled={isActing} className="btn btn--danger">
              Minta Revisi
            </button>
          </div>
        )}

        {isLeadAdmin && content.status === "approved" && (
          <div className="panel">
            <span className="eyebrow">Siap tayang</span>
            <button onClick={handlePublish} disabled={isActing} className="btn btn--primary">
              {isActing ? "Memproses..." : "Tandai Tayang / Publish"}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="panel panel--flat" style={{ background: "var(--paper-alt)" }}>
            <span className="eyebrow">Riwayat Approval</span>
            <div className="stack stack--sm">
              {history.map((h) => (
                <div key={h.id} style={{ fontSize: 13 }}>
                  <strong style={{ color: h.status === "approved" ? "var(--green)" : "var(--red)" }}>
                    {h.status === "approved" ? "Disetujui" : "Perlu revisi"}
                  </strong>{" "}
                  oleh {h.reviewer?.name || "-"} ·{" "}
                  <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {new Date(h.reviewedAt).toLocaleString("id-ID")}
                  </span>
                  {h.notes && <div className="text-muted">Catatan: {h.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLeadAdmin && (
          <div className="panel panel--dashed">
            <span className="eyebrow">Override status manual (darurat/testing)</span>
            <div className="btn-row">
              {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={isSaving || content.status === status}
                  className="btn btn--sm"
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}