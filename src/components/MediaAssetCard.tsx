import { useEffect, useRef, useState } from "react";
import {
  api,
  mediaFileUrl,
  type MediaAsset,
  type MediaVersion,
  type MediaComment,
} from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";
import { UploadProgressBar } from "./UploadProgressBar";

export function MediaAssetCard({
  asset,
  isLeadAdmin,
  onChanged,
}: {
  asset: MediaAsset;
  isLeadAdmin: boolean;
  onChanged: () => void;
}) {
  const confirmDialog = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedVersions = [...asset.versions].sort((a, b) => b.versionNumber - a.versionNumber);

  async function handleUploadVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingVersion(true);
    setUploadProgress(0);
    setError(null);
    try {
      await api.uploadMediaVersion(asset.id, file, setUploadProgress);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal upload versi baru");
    } finally {
      setIsUploadingVersion(false);
      setUploadProgress(null);
      e.target.value = "";
    }
  }

  async function handleDeleteAsset() {
    if (!(await confirmDialog(`Hapus media "${asset.fileName}" beserta semua versinya?`))) return;
    setIsDeleting(true);
    try {
      await api.deleteMediaAsset(asset.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus media");
      setIsDeleting(false);
    }
  }

  return (
    <div className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{asset.fileName}</strong>
        <div className="btn-row">
          <label className="btn btn--sm" style={{ cursor: "pointer" }}>
            {isUploadingVersion ? "Mengunggah..." : "+ Upload Revisi"}
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleUploadVersion}
              disabled={isUploadingVersion}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={handleDeleteAsset} disabled={isDeleting} className="btn btn--sm btn--danger">
            {isDeleting ? (
              <span className="processing-indicator">
                <span className="processing-indicator__dot" /> Menghapus...
              </span>
            ) : (
              "Hapus"
            )}
          </button>
        </div>
      </div>

      {uploadProgress !== null && <UploadProgressBar percent={uploadProgress} />}
      {error && <p className="callout callout--error" style={{ marginTop: 10 }}>{error}</p>}

      {sortedVersions.length > 1 && (
        <p className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
          Ada {sortedVersions.length} versi aktif. Versi lama otomatis terhapus begitu salah satu
          versi di-approve.
        </p>
      )}

      <div className="stack" style={{ marginTop: 12 }}>
        {sortedVersions.map((v) => (
          <MediaVersionBlock key={v.id} version={v} mimeType={asset.mimeType} fileName={asset.fileName} isLeadAdmin={isLeadAdmin} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}

function MediaVersionBlock({
  version,
  mimeType,
  fileName,
  isLeadAdmin,
  onChanged,
}: {
  version: MediaVersion;
  mimeType: string | null;
  fileName: string;
  isLeadAdmin: boolean;
  onChanged: () => void;
}) {
  const confirmDialog = useConfirm();
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pinCommentText, setPinCommentText] = useState("");

  const [pendingTimestamp, setPendingTimestamp] = useState<number | null>(null);
  const [timestampCommentText, setTimestampCommentText] = useState("");

  const [newTopLevelComment, setNewTopLevelComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const isImage = mimeType?.startsWith("image/");
  const isVideo = mimeType?.startsWith("video/");

  async function loadComments() {
    setIsLoadingComments(true);
    try {
      setComments(await api.listMediaComments(version.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat komentar");
    } finally {
      setIsLoadingComments(false);
    }
  }

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version.id]);

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPin({ x, y });
    setPinCommentText("");
  }

  async function submitPinComment() {
    if (!pendingPin || !pinCommentText.trim()) return;
    try {
      await api.addMediaComment(version.id, {
        commentText: pinCommentText.trim(),
        positionX: pendingPin.x,
        positionY: pendingPin.y,
      });
      setPendingPin(null);
      setPinCommentText("");
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komentar");
    }
  }

  function markVideoTimestamp() {
    const t = videoRef.current?.currentTime ?? 0;
    setPendingTimestamp(t);
    setTimestampCommentText("");
  }

  async function submitTimestampComment() {
    if (pendingTimestamp === null || !timestampCommentText.trim()) return;
    try {
      await api.addMediaComment(version.id, {
        commentText: timestampCommentText.trim(),
        timestampSeconds: pendingTimestamp,
      });
      setPendingTimestamp(null);
      setTimestampCommentText("");
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komentar");
    }
  }

  async function submitTopLevelComment() {
    if (!newTopLevelComment.trim()) return;
    try {
      await api.addMediaComment(version.id, { commentText: newTopLevelComment.trim() });
      setNewTopLevelComment("");
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah komentar");
    }
  }

  async function submitReply(parentId: string) {
    if (!replyText.trim()) return;
    try {
      await api.addMediaComment(version.id, {
        commentText: replyText.trim(),
        parentCommentId: parentId,
      });
      setReplyText("");
      setReplyingTo(null);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membalas komentar");
    }
  }

  async function handleToggleResolve(comment: MediaComment) {
    try {
      await api.resolveMediaComment(comment.id, !comment.isResolved);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status komentar");
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!(await confirmDialog("Hapus komentar ini?"))) return;
    try {
      await api.deleteMediaComment(commentId);
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus komentar");
    }
  }

  async function handleApprove() {
    const ok = await confirmDialog(
      "Approve versi ini? Versi lain yang masih aktif akan otomatis terhapus.",
      { danger: false, confirmLabel: "Ya, Approve" }
    );
    if (!ok) {
      return;
    }
    setIsApproving(true);
    setError(null);
    try {
      await api.approveMediaVersion(version.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal approve versi");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const suffix = version.versionNumber > 1 ? `-v${version.versionNumber}` : "";
      await api.downloadMediaVersion(version.id, fileName.replace(/(\.[^.]+)?$/, `${suffix}$1`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh file");
    } finally {
      setIsDownloading(false);
    }
  }

  const topLevelComments = comments.filter((c) => !c.parentCommentId);
  const repliesOf = (parentId: string) => comments.filter((c) => c.parentCommentId === parentId);

  return (
    <div style={{ border: "2px solid var(--ink)", borderRadius: 4, padding: 12, background: "var(--paper-alt)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
            VERSI {version.versionNumber}
          </span>
          <span className={`stamp ${version.status === "approved" ? "stamp--approved" : "stamp--pending_review"}`} style={{ fontSize: 11 }}>
            {version.status === "approved" ? "Disetujui" : "Menunggu Review"}
          </span>
        </span>
        <div className="btn-row">
          <button onClick={handleDownload} disabled={isDownloading} className="btn btn--sm">
            {isDownloading ? "Mengunduh..." : "⬇ Unduh"}
          </button>
          {isLeadAdmin && version.status === "pending" && (
            <button onClick={handleApprove} disabled={isApproving} className="btn btn--sm btn--green">
              {isApproving ? "Memproses..." : "✓ Approve versi ini"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="callout callout--error" style={{ marginTop: 10 }}>{error}</p>}

      <div style={{ position: "relative", marginTop: 10, maxWidth: 500 }}>
        {isImage && (
          <div style={{ position: "relative", display: "inline-block", border: "3px solid var(--ink)", borderRadius: 4, overflow: "hidden" }}>
            <img
              src={mediaFileUrl(version.id)}
              alt={`Versi ${version.versionNumber}`}
              crossOrigin="anonymous"
              onClick={handleImageClick}
              style={{ maxWidth: "100%", display: "block", cursor: "crosshair" }}
            />
            {topLevelComments
              .filter((c) => c.positionX !== null && c.positionY !== null)
              .map((c) => (
                <div
                  key={c.id}
                  title={c.commentText}
                  style={{
                    position: "absolute",
                    left: `${c.positionX}%`,
                    top: `${c.positionY}%`,
                    transform: "translate(-50%, -50%)",
                    background: c.isResolved ? "var(--green)" : "var(--red)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    border: "2px solid var(--paper)",
                  }}
                >
                  !
                </div>
              ))}
            {pendingPin && (
              <div
                style={{
                  position: "absolute",
                  left: `${pendingPin.x}%`,
                  top: `${pendingPin.y}%`,
                  transform: "translate(-50%, -50%)",
                  background: "var(--yellow)",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  border: "2px solid var(--ink)",
                }}
              />
            )}
          </div>
        )}

        {isVideo && (
          <video
            ref={videoRef}
            src={mediaFileUrl(version.id)}
            controls
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
            style={{ maxWidth: "100%", display: "block", border: "3px solid var(--ink)", borderRadius: 4 }}
          />
        )}

        {!isImage && !isVideo && (
          <a href={mediaFileUrl(version.id)} target="_blank" rel="noreferrer" className="btn btn--sm">
            Buka / download file
          </a>
        )}
      </div>

      {isImage && (
        <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
          Klik di gambar untuk taruh pin komentar di titik tertentu.
        </p>
      )}
      {isImage && pendingPin && (
        <div className="btn-row" style={{ marginTop: 6 }}>
          <input
            type="text"
            placeholder="Komentar di titik ini..."
            value={pinCommentText}
            onChange={(e) => setPinCommentText(e.target.value)}
            className="input"
            style={{ flex: 1, minWidth: 160 }}
          />
          <button onClick={submitPinComment} className="btn btn--sm btn--primary">
            Kirim
          </button>
          <button onClick={() => setPendingPin(null)} className="btn btn--sm btn--ghost">
            Batal
          </button>
        </div>
      )}

      {isVideo && (
        <div style={{ marginTop: 8 }}>
          <button onClick={markVideoTimestamp} className="btn btn--sm">
            Tandai komentar di waktu ini
          </button>
          {pendingTimestamp !== null && (
            <div className="btn-row" style={{ marginTop: 6 }}>
              <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12, alignSelf: "center" }}>
                {pendingTimestamp.toFixed(1)}s
              </span>
              <input
                type="text"
                placeholder="Komentar di detik ini..."
                value={timestampCommentText}
                onChange={(e) => setTimestampCommentText(e.target.value)}
                className="input"
                style={{ flex: 1, minWidth: 160 }}
              />
              <button onClick={submitTimestampComment} className="btn btn--sm btn--primary">
                Kirim
              </button>
              <button onClick={() => setPendingTimestamp(null)} className="btn btn--sm btn--ghost">
                Batal
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <span className="eyebrow" style={{ marginBottom: 8 }}>Komentar & Diskusi</span>

        {isLoadingComments && <p className="text-muted" style={{ fontSize: 12 }}>Memuat komentar...</p>}
        {!isLoadingComments && topLevelComments.length === 0 && (
          <p className="text-muted" style={{ fontSize: 12 }}>Belum ada komentar.</p>
        )}

        <div className="stack stack--sm">
          {topLevelComments.map((c) => (
            <div key={c.id} style={{ borderBottom: "2px dashed #ccc", paddingBottom: 8 }}>
              <div style={{ fontSize: 13 }}>
                <strong>{c.user?.name || "-"}</strong>
                {c.timestampSeconds !== null && (
                  <span className="text-muted"> @ {c.timestampSeconds.toFixed(1)}s</span>
                )}
                {c.positionX !== null && <span className="text-muted"> @ pin</span>}
                {c.isResolved && <span className="text-success"> · Selesai</span>}
              </div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{c.commentText}</div>
              <div className="btn-row" style={{ marginTop: 4 }}>
                <button onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)} className="btn btn--sm btn--ghost">
                  Balas
                </button>
                <button onClick={() => handleToggleResolve(c)} className="btn btn--sm btn--ghost">
                  {c.isResolved ? "Buka lagi" : "Tandai selesai"}
                </button>
                <button onClick={() => handleDeleteComment(c.id)} className="btn btn--sm btn--ghost" style={{ color: "var(--red)" }}>
                  Hapus
                </button>
              </div>

              {repliesOf(c.id).length > 0 && (
                <div className="stack stack--sm" style={{ marginLeft: 16, marginTop: 6 }}>
                  {repliesOf(c.id).map((r) => (
                    <div key={r.id} style={{ fontSize: 12, borderLeft: "3px solid var(--ink)", paddingLeft: 8 }}>
                      <div>
                        <strong>{r.user?.name || "-"}:</strong> {r.commentText}
                      </div>
                      <div className="btn-row" style={{ marginTop: 2 }}>
                        <button
                          onClick={() => {
                            setReplyingTo(replyingTo === c.id ? null : c.id);
                            setReplyText(r.user?.name ? `@${r.user.name} ` : "");
                          }}
                          className="btn btn--sm btn--ghost"
                          style={{ fontSize: 11 }}
                        >
                          Balas
                        </button>
                        <button onClick={() => handleDeleteComment(r.id)} className="btn btn--sm btn--ghost" style={{ color: "var(--red)", fontSize: 11 }}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {replyingTo === c.id && (
                <div className="btn-row" style={{ marginTop: 6, marginLeft: 16 }}>
                  <input
                    type="text"
                    placeholder="Balas komentar..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="input"
                    style={{ flex: 1, minWidth: 160 }}
                  />
                  <button onClick={() => submitReply(c.id)} className="btn btn--sm btn--primary">
                    Kirim
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="btn-row" style={{ marginTop: 10 }}>
          <input
            type="text"
            placeholder="Tulis komentar umum..."
            value={newTopLevelComment}
            onChange={(e) => setNewTopLevelComment(e.target.value)}
            className="input"
            style={{ flex: 1, minWidth: 160 }}
          />
          <button onClick={submitTopLevelComment} className="btn btn--sm btn--primary">
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}