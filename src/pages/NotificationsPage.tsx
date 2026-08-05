import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AppNotification } from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";

const TYPE_LABEL: Record<AppNotification["type"], string> = {
  approval: "Disetujui",
  revisi: "Perlu Revisi",
  comment: "Komentar",
  reply: "Balasan",
  media_approved: "Media Disetujui",
  submitted: "Menunggu Review",
  published: "Tayang",
};

const TYPE_COLOR: Record<AppNotification["type"], string> = {
  approval: "var(--green)",
  revisi: "var(--red)",
  comment: "var(--blue)",
  reply: "var(--blue)",
  media_approved: "var(--green)",
  submitted: "var(--yellow)",
  published: "var(--green)",
};

const TYPE_STAMP: Record<AppNotification["type"], string> = {
  approval: "approved",
  media_approved: "approved",
  published: "approved",
  revisi: "revisi",
  submitted: "pending_review",
  comment: "pending_review",
  reply: "pending_review",
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const confirmDialog = useConfirm();
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

  async function handleDeleteAll() {
    if (!(await confirmDialog("Hapus semua notifikasi? Tindakan ini tidak bisa dibatalkan."))) return;
    try {
      await api.deleteAllNotifications();
      setItems([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus semua notifikasi");
    }
  }

  async function handleDeleteOne(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setItems((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus notifikasi");
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
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <span className="eyebrow">Kotak Masuk</span>
          <h1 style={{ marginBottom: 0 }}>
            Notifikasi {unreadCount > 0 && <span className="badge-count">{unreadCount} baru</span>}
          </h1>
        </div>
        <div className="btn-row">
          {unreadCount > 0 && (
            <button onClick={handleAllRead} className="btn btn--sm">
              Tandai semua dibaca
            </button>
          )}
          {items.length > 0 && (
            <button onClick={handleDeleteAll} className="btn btn--sm btn--danger">
              Hapus semua
            </button>
          )}
        </div>
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
            className="panel panel--tight row-clickable notif-card"
            style={{
              borderLeftWidth: 6,
              borderLeftColor: n.isRead ? "var(--ink)" : (TYPE_COLOR[n.type] as string),
              boxShadow: n.isRead ? "none" : "var(--shadow-sm)",
              background: n.isRead ? "var(--paper)" : "var(--paper-alt)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!n.isRead && <span className="notif-dot" title="Belum dibaca" />}
                <span className={`stamp stamp--${TYPE_STAMP[n.type]}`} style={{ fontSize: 11 }}>
                  {TYPE_LABEL[n.type]}
                </span>
                {!n.isRead && (
                  <span className="text-muted" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
                    BARU
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                  {new Date(n.createdAt).toLocaleString("id-ID")}
                </span>
                <button
                  onClick={(e) => handleDeleteOne(e, n.id)}
                  className="btn btn--sm btn--danger"
                  style={{ padding: "2px 8px", fontSize: 11 }}
                  title="Hapus notifikasi ini"
                >
                  ✕
                </button>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", fontWeight: n.isRead ? 400 : 600 }}>{n.message}</p>
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