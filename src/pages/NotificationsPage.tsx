import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AppNotification } from "../lib/api";

const TYPE_LABEL: Record<AppNotification["type"], string> = {
  approval: "Disetujui",
  revisi: "Perlu Revisi",
  comment: "Komentar",
  media_approved: "Media Disetujui",
};

const TYPE_COLOR: Record<AppNotification["type"], string> = {
  approval: "var(--green)",
  revisi: "var(--red)",
  comment: "var(--blue)",
  media_approved: "var(--green)",
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await api.listNotifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat notifikasi");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAllRead() {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menandai semua notifikasi");
    }
  }

  // klik kartu = otomatis ditandai dibaca, lalu buka kontennya kalau ada
  async function handleOpen(n: AppNotification) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      api.markNotificationRead(n.id).catch(() => {});
    }
    if (n.content) {
      navigate(`/content/${n.content.id}/edit`);
    }
  }

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: 900}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <span className="eyebrow">Kotak Masuk</span>
          <h1 style={{ marginBottom: 0 }}>
            Notifikasi {unreadCount > 0 && <span className="badge-count">{unreadCount} baru</span>}
          </h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleAllRead} className="btn btn--sm">
            Tandai semua dibaca
          </button>
        )}
      </div>

      {isLoading && <p className="text-muted">Memuat...</p>}
      {error && <p className="callout callout--error">{error}</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">Belum ada notifikasi.</div>
      )}

      <div className="stack stack--sm">
        {items.map((n) => (
          <div
            key={n.id}
            role="button"
            tabIndex={0}
            onClick={() => handleOpen(n)}
            onKeyDown={(e) => e.key === "Enter" && handleOpen(n)}
            className="panel panel--tight row-clickable"
            style={{
              borderLeftWidth: 6,
              borderLeftColor: n.isRead ? "var(--ink)" : (TYPE_COLOR[n.type] as string),
              boxShadow: n.isRead ? "none" : "var(--shadow-sm)",
              opacity: n.isRead ? 0.7 : 1,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                className={`stamp stamp--${n.type === "revisi" ? "revisi" : n.type === "approval" || n.type === "media_approved" ? "approved" : "pending_review"}`}
                style={{ fontSize: 11 }}
              >
                {TYPE_LABEL[n.type]}
              </span>
              <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {new Date(n.createdAt).toLocaleString("id-ID")}
              </span>
            </div>
            <p style={{ margin: "8px 0 0" }}>{n.message}</p>
            {n.content && (
              <p className="text-muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>
                Klik untuk buka konten →
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}