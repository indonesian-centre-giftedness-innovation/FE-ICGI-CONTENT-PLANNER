import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type StoryboardSummary } from "../lib/api";
import { StatusStamp } from "../components/StatusStamp";

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  if (mins === 0) return `${secs}d`;
  return `${mins}m ${secs}d`;
}

export function StoryboardListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StoryboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAllStoryboards()
      .then(setItems)
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreateStandalone() {
    setIsCreating(true);
    setError(null);
    try {
      const created = await api.createStoryboard(undefined, "Storyboard baru");
      navigate(`/storyboard/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat storyboard");
      setIsCreating(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <div>
          <span className="eyebrow">Meja Redaksi</span>
          <h1 style={{ marginBottom: 0 }}>Storyboard</h1>
        </div>
        <button onClick={handleCreateStandalone} disabled={isCreating} className="btn btn--primary">
          {isCreating ? "Membuat..." : "+ Storyboard Baru (tanpa draft)"}
        </button>
      </div>
      <p className="text-muted" style={{ marginBottom: 24 }}>
        Semua storyboard, baik yang menempel ke draft konten maupun berdiri sendiri.
      </p>

      {error && <p className="callout callout--error">{error}</p>}
      {isLoading && <p className="text-muted">Memuat...</p>}

      {!isLoading && items.length === 0 && (
        <div className="empty-state panel panel--dashed">
          Belum ada storyboard. Buat dari draft konten, atau klik tombol di atas.
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
                  <td>{sb.content?.platform || "-"}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}