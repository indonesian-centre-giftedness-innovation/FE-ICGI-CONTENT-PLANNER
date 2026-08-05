import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { api, type Content, type ContentStatus, type Approval, type ContentPillar } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusStamp, STATUS_LABEL } from "../components/StatusStamp";
import { PlatformPicker } from "../components/PlatformPicker";
import { PillarPicker } from "../components/PillarPicker";
import { ContentTodoList } from "../components/ContentTodoList";
import { DraftVersionCards } from "../components/DraftVersionCards";
import { useConfirm } from "../context/ConfirmContext";

/**
 * Form Draft Konten — dipakai untuk BUAT baru (/content/new) maupun EDIT (/content/:id/edit).
 * Kalau `id` tidak ada di URL berarti mode "baru": cuma tampil field dasar + Simpan/Batal.
 * Setelah tersimpan, otomatis pindah ke mode edit (URL berganti /content/:id/edit) dengan
 * fitur lengkap (todo, approval, link ke storyboard/kalender/media, dst).
 */
export function ContentEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillDate = searchParams.get("date"); // dari klik tanggal kosong di kalender
  const { user } = useAuth();
  const confirmDialog = useConfirm();

  const [content, setContent] = useState<Content | null>(null);
  const [title, setTitle] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [pillar, setPillar] = useState<ContentPillar | "">("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [history, setHistory] = useState<Approval[]>([]);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    api
      .getContent(id)
      .then((data) => {
        setContent(data);
        setTitle(data.title);
        setPlatforms(data.platforms ?? []);
        setPillar(data.pillar ?? "");
        setBodyDraft(data.bodyDraft ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat konten"))
      .finally(() => setIsLoading(false));

    api.getApprovalHistory(id).then(setHistory).catch(() => {});
  }, [id]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (isNew) {
        if (!title.trim()) {
          setError("Judul wajib diisi");
          setIsSaving(false);
          return;
        }
        const created = await api.createContent({
          title: title.trim(),
          platforms,
          pillar: pillar || undefined,
          bodyDraft: bodyDraft || undefined,
        });
        if (prefillDate) {
          await api
            .createCalendarItem({ contentId: created.id, scheduledDate: prefillDate, platform: platforms[0] || undefined })
            .catch(() => {});
        }
        navigate(`/content/${created.id}/edit`, { replace: true });
        return;
      }
      const updated = await api.updateContent(id!, {
        title: title.trim(),
        platforms,
        pillar: pillar || null,
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
      navigate("/content");
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
  if (!isNew && !content) return <p className="callout callout--error">{error || "Konten tidak ditemukan"}</p>;

  const isLeadAdmin = user?.role === "lead_admin";
  const isOwner = content ? content.createdBy === user?.userId : true;

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link to="/content" className="btn btn--sm" style={{ marginBottom: 16, display: "inline-flex" }}>
        &larr; Kembali ke daftar konten
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ marginBottom: 0 }}>{isNew ? "Draft Konten Baru" : "Edit Draft"}</h1>
        {content && <StatusStamp status={content.status} />}
      </div>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {isNew
          ? "Langkah 1 — Ide & Draft"
          : content?.requiresApproval
          ? "Konten ini perlu approval Lead/Admin sebelum tayang."
          : "Konten ini auto-publish (dibuat oleh Lead/Admin)."}
      </p>

      <div className="stack">
        <div className="panel">
          <label className="field">
            <span className="field__label">Judul</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder={isNew ? "Misal: Promo Ramadhan 2026" : undefined}
            />
          </label>

          <div className="field">
            <span className="field__label">Platform {isNew && "(opsional, bisa pilih lebih dari satu)"}</span>
            <PlatformPicker value={platforms} onChange={setPlatforms} />
          </div>

          <div className="field">
            <span className="field__label">Pillar {isNew && "(opsional)"}</span>
            <PillarPicker value={pillar} onChange={setPillar} />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field__label">Draft</span>
            <DraftVersionCards
              key={id || "new"}
              title={title}
              platforms={platforms}
              pillar={pillar}
              value={bodyDraft}
              onChange={setBodyDraft}
            />
          </div>

          {error && (
            <p className="callout callout--error" style={{ marginTop: 14 }}>
              {error}
            </p>
          )}
          {notice && (
            <p className="callout callout--success" style={{ marginTop: 14 }}>
              {notice}
            </p>
          )}

          <div className="btn-row" style={{ marginTop: 16 }}>
            <button onClick={handleSave} disabled={isSaving} className="btn btn--primary">
              {isSaving ? "Menyimpan..." : isNew ? "Simpan Draft" : "Simpan Perubahan"}
            </button>
            {isNew ? (
              <Link to="/content" className="btn">
                Batal
              </Link>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {!isNew && id && <ContentTodoList contentId={id} />}

        {content && (isOwner || isLeadAdmin) && (content.status === "draft" || content.status === "revisi") && (
          <div className="panel">
            <span className="eyebrow">Langkah berikutnya</span>
            <button onClick={handleSubmitForReview} disabled={isActing} className="btn btn--blue">
              {isActing ? "Mengirim..." : "Submit untuk Review"}
            </button>
          </div>
        )}

        {content && isLeadAdmin && content.status === "pending_review" && (
          <div className="panel">
            <span className="eyebrow">Aksi Review (Lead/Admin)</span>
            <div className="btn-row" style={{ marginBottom: 12 }}>
              <button onClick={handleApprove} disabled={isActing} className="btn btn--green">
                ✓ Approve
              </button>
            </div>
            <label className="field" style={{ marginBottom: 8 }}>
              <span className="field__label">Catatan revisi (wajib diisi untuk minta revisi)</span>
              <textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} rows={2} className="textarea" />
            </label>
            <button onClick={handleRequestRevision} disabled={isActing} className="btn btn--danger">
              Minta Revisi
            </button>
          </div>
        )}

        {content && isLeadAdmin && content.status === "approved" && (
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

        {content && isLeadAdmin && (
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