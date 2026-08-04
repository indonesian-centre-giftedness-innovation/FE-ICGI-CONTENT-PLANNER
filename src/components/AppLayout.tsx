import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

function SidebarLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      className={({ isActive }) => "sidebar__link" + (isActive ? " sidebar__link--active" : "")}
    >
      <span>{children}</span>
    </NavLink>
  );
}

// beep notifikasi disintesis langsung (tanpa file audio eksternal)
function playNotifySound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // browser tidak support Web Audio / autoplay diblokir sebelum ada interaksi user — abaikan
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef<number | null>(null);

  async function pollNotifications() {
    try {
      const items = await api.listNotifications();
      const count = items.filter((n) => !n.isRead).length;
      if (prevUnreadRef.current !== null && count > prevUnreadRef.current) {
        playNotifySound();
      }
      prevUnreadRef.current = count;
      setUnreadCount(count);
    } catch {
      // gagal poll, coba lagi di interval berikutnya
    }
  }

  useEffect(() => {
    pollNotifications();
    const interval = setInterval(pollNotifications, 25000); // cek tiap 25 detik
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      await refresh();
      navigate("/login");
    }
  }

  const isLeadAdmin = user?.role === "lead_admin";

  return (
    <div className="page-shell">
      <aside className="sidebar">
        <Link to="/dashboard" className="sidebar__brand">
          <span className="sidebar__brand-mark">ICGI</span>
          Content Planner
        </Link>

        <nav className="sidebar__nav">
          {isLeadAdmin ? (
            <>
              <div className="sidebar__section">
                <span className="sidebar__section-label">Utama</span>
                <SidebarLink to="/dashboard">Dashboard</SidebarLink>
                <NavLink
                  to="/notifications"
                  className={({ isActive }) => "sidebar__link" + (isActive ? " sidebar__link--active" : "")}
                >
                  <span>Notifikasi</span>
                  {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
                </NavLink>
                <SidebarLink to="/todos">To-Do</SidebarLink>
                <SidebarLink to="/media">Media</SidebarLink>
              </div>

              <div className="sidebar__section">
                <span className="sidebar__section-label">Redaksi</span>
                <SidebarLink to="/review">Review</SidebarLink>
                <SidebarLink to="/prompt-templates">Prompt Templates</SidebarLink>
                <SidebarLink to="/team">Anggota Tim</SidebarLink>
              </div>
            </>
          ) : (
            <>
              <div className="sidebar__section">
                <span className="sidebar__section-label">Utama</span>
                <SidebarLink to="/dashboard">Dashboard</SidebarLink>
                <SidebarLink to="/content/new">+ Draft Baru</SidebarLink>
                <NavLink
                  to="/notifications"
                  className={({ isActive }) => "sidebar__link" + (isActive ? " sidebar__link--active" : "")}
                >
                  <span>Notifikasi</span>
                  {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
                </NavLink>
              </div>

              <div className="sidebar__section">
                <span className="sidebar__section-label">Produksi</span>
                <SidebarLink to="/todos">To-Do</SidebarLink>
                <SidebarLink to="/storyboard">Storyboard</SidebarLink>
                <SidebarLink to="/media">Media</SidebarLink>
              </div>
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__role">{isLeadAdmin ? "Lead / Admin" : "Creator / Staff"}</div>
          <button onClick={handleLogout} className="btn btn--sm btn--danger" style={{ width: "100%", marginTop: 4 }}>
            Keluar
          </button>
        </div>
      </aside>

      <main className="page-content">{children}</main>
    </div>
  );
}