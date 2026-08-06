import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type StoryboardSummary } from "../lib/api";
import { StatusStamp } from "../components/StatusStamp";
import { useConfirm } from "../context/ConfirmContext";

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  if (mins === 0) return `${secs}d`;
  return `${mins}m ${secs}d`;
}

export function StoryboardListPage() {
  const navigate = useNavigate();
  const confirmDialog = useConfirm();
  const [items, setItems] = useState<StoryboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    api
      .listAllStoryboards()
      .then(setItems)
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreateStandalone(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      setError("Judul storyboard wajib diisi");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const created = await api.createStoryboard(undefined, newTitle.trim());
      navigate(`/storyboard/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat storyboard");
      setIsCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, sb: StoryboardSummary) {
    e.stopPropagation();
    const ok = await confirmDialog(
      `Hapus storyboard "${sb.content?.title || sb.title || "tanpa judul"}" secara permanen? Semua scene di dalamnya ikut terhapus.`,
      { confirmLabel: "Ya, Hapus Permanen" }
    );
    if (!ok) return;
    setDeletingId(sb.id);
    setError(null);
    try {
      await api.deleteStoryboard(sb.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus storyboard");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 0 }}>Storyboard</h1>
        </div>
      </div>
      <p className="text-muted" style={{ marginBottom: 16 }}>
        Semua storyboard, baik yang menempel ke draft konten maupun berdiri sendiri.
      </p>

      <form onSubmit={handleCreateStandalone} className="btn-row" style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Judul storyboard baru (tanpa draft)..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: 220 }}
        />
        <button type="submit" disabled={isCreating} className="btn btn--primary">
          {isCreating ? "Membuat..." : "+ Buat Storyboard"}
        </button>
      </form>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada storyboard. Buat dari draft konten, atau lewat form di atas.
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                <th>Storyboard</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Jumlah Scene</th>
                <th>Total Durasi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((sb) => (
                <tr
                  key={sb.id}
                  className="row-clickable"
                  onClick={() =>
                    navigate(sb.content ? `/content/${sb.contentId}/storyboard` : `/storyboard/${sb.id}`)
                  }
                >
                  <td style={{ fontWeight: 700 }}>
                    {sb.content?.title || sb.title || "(tanpa judul)"}
                  </td>
                  <td>{sb.content?.platforms && sb.content.platforms.length ? sb.content.platforms.join(", ") : "-"}</td>
                  <td>
                    {sb.content ? (
                      <StatusStamp status={sb.content.status} />
                    ) : (
                      <span className="stamp" style={{ color: "#8a8a8f" }}>Standalone</span>
                    )}
                  </td>
                  <td>{sb.sceneCount}</td>
                  <td className="text-muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {formatDuration(sb.totalDurationSeconds)}
                  </td>
                  <td>
                    <button
                      onClick={(e) => handleDelete(e, sb)}
                      disabled={deletingId === sb.id}
                      className="btn btn--sm btn--danger"
                    >
                      {deletingId === sb.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}