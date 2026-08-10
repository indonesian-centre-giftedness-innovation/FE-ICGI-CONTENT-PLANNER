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

// suara notifikasi — file audio custom di public/SOGI.mp3
const notifyAudio = new Audio("/SOGI.mp3");
notifyAudio.volume = 0.6;

function playNotifySound() {
  try {
    notifyAudio.currentTime = 0;
    void notifyAudio.play();
  } catch {
    // autoplay diblokir sebelum ada interaksi user, atau file belum tersedia — abaikan
  }
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef<number | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    setIsMobileNavOpen(false);
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
      <div className="mobile-topbar">
        <Link to="/dashboard" className="sidebar__brand" onClick={() => setIsMobileNavOpen(false)}>
          <span className="sidebar__brand-mark">ICGI</span>
          Content Planner
        </Link>
        <button
          className="mobile-topbar__toggle"
          onClick={() => setIsMobileNavOpen((v) => !v)}
          aria-label="Buka menu"
        >
          {unreadCount > 0 && !isMobileNavOpen && <span className="badge-count mobile-topbar__badge">{unreadCount}</span>}
          <span className={`hamburger${isMobileNavOpen ? " hamburger--open" : ""}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <aside className={`sidebar${isMobileNavOpen ? " sidebar--open" : ""}`}>
        <Link to="/dashboard" className="sidebar__brand">
          <span className="sidebar__brand-mark">ICGI</span>
          Content Planner
        </Link>

        <nav className="sidebar__nav" onClick={() => setIsMobileNavOpen(false)}>
          {isLeadAdmin ? (
            <>
              <div className="sidebar__section">
                <span className="sidebar__section-label">Utama</span>
                <SidebarLink to="/dashboard">Dashboard</SidebarLink>
                <SidebarLink to="/content">Konten</SidebarLink>
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
                <SidebarLink to="/content">Konten</SidebarLink>
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

              <div className="sidebar__section">
                <span className="sidebar__section-label">Redaksi</span>
                <SidebarLink to="/review">Review</SidebarLink>
                <SidebarLink to="/prompt-templates">Prompt Templates</SidebarLink>
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

      {isMobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setIsMobileNavOpen(false)} />}

      <main className="page-content">{children}</main>
    </div>
  );
}