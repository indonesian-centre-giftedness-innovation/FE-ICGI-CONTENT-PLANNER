import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { api, type Content, type ContentPillar } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { StatusStamp } from "../components/StatusStamp";
import { PlatformPicker } from "../components/PlatformPicker";
import { PillarPicker } from "../components/PillarPicker";
import { ContentTodoList } from "../components/ContentTodoList";
import { DraftVersionCards } from "../components/DraftVersionCards";
import { useConfirm } from "../context/ConfirmContext";

/**
 * Form Draft Konten — dipakai untuk BUAT baru (/content/new) maupun EDIT (/content/:id/edit).
 * Kalau `id` tidak ada di URL berarti mode "baru": cuma tampil field dasar + Simpan/Batal.
 *
 * Draft SCRIPT tidak butuh approval/review sama sekali — siapa pun (pemiliknya) bisa langsung
 * pakai draftnya tanpa harus disetujui Lead/Admin. Yang perlu direview cuma MEDIA (lihat halaman
 * Media & Review). Lead/Admin tetap bisa BUKA draft orang lain untuk referensi, tapi read-only —
 * tidak bisa edit langsung isi draft milik orang lain (lihat isReviewerMode).
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

  if (isLoading) return <p className="text-muted">Memuat...</p>;
  if (!isNew && !content) return <p className="callout callout--error">{error || "Konten tidak ditemukan"}</p>;

  const isLeadAdmin = user?.role === "lead_admin";
  const isOwner = content ? content.createdBy === user?.userId : true;
  // Lead/Admin yang buka draft BUKAN buatan sendiri: cuma bisa lihat isinya buat referensi,
  // tidak bisa edit langsung (Judul/Platform/Pillar/Draft dikunci read-only).
  const isReviewerMode = !isNew && !!content && isLeadAdmin && !isOwner;

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link to="/content" className="btn btn--sm" style={{ marginBottom: 16, display: "inline-flex" }}>
        &larr; Kembali ke daftar konten
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h1 style={{ marginBottom: 0 }}>
          {isNew ? "Draft Konten Baru" : isReviewerMode ? "Lihat Draft" : "Edit Draft"}
        </h1>
        {content && <StatusStamp status={content.status} />}
      </div>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        {isNew
          ? "Langkah 1 — Ide & Draft. Draft script tidak perlu approval, langsung bisa dipakai."
          : isReviewerMode
          ? `Draft dibuat oleh ${content?.author?.name || "creator"} — kamu bisa lihat isinya, tapi tidak bisa edit langsung.`
          : "Draft script tidak perlu approval — yang perlu direview cuma media (gambar/video) di menu Media & Review."}
      </p>

      <div className="stack">
        {isReviewerMode ? (
          <div className="panel">
            <span className="field__label">Judul</span>
            <h2 style={{ marginTop: 4, marginBottom: 16 }}>{content!.title}</h2>

            <span className="field__label">Platform</span>
            <p style={{ marginTop: 4, marginBottom: 16 }}>
              {content!.platforms && content!.platforms.length ? content!.platforms.join(", ") : <span className="text-muted">-</span>}
            </p>

            <span className="field__label">Pillar</span>
            <p style={{ marginTop: 4, marginBottom: 16 }}>
              {content!.pillar || <span className="text-muted">-</span>}
            </p>

            <span className="field__label">Draft</span>
            <div
              className="panel panel--flat"
              style={{ background: "var(--paper-alt)", whiteSpace: "pre-wrap", marginTop: 4, marginBottom: 0 }}
            >
              {content!.bodyDraft?.trim() ? content!.bodyDraft : <span className="text-muted">(draft masih kosong)</span>}
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
        ) : (
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
        )}

        {!isNew && id && <ContentTodoList contentId={id} />}
      </div>
    </div>
  );
}