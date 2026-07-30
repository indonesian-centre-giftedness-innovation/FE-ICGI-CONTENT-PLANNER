import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Storyboard } from "../lib/api";
import { StoryboardEditor } from "../components/StoryboardEditor";

export function StoryboardPage() {
  const { id: contentId } = useParams<{ id: string }>();

  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  async function load() {
    if (!contentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getStoryboardByContent(contentId);
      setStoryboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat storyboard");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  async function handleCreateStoryboard() {
    if (!contentId) return;
    try {
      const created = await api.createStoryboard(contentId);
      setStoryboard({ ...created, scenes: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat storyboard");
    }
  }

  async function handleExportPdf() {
    if (!storyboard) return;
    setIsExportingPdf(true);
    setError(null);
    try {
      await api.exportStoryboardPdf(storyboard.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (isLoading) return <p className="text-muted">Memuat...</p>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to={`/content/${contentId}/edit`}>&larr; Kembali ke draft konten</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="eyebrow">Rencana Produksi</span>
          <h1 style={{ marginBottom: 0 }}>Storyboard</h1>
        </div>
        {storyboard && (
          <button onClick={handleExportPdf} disabled={isExportingPdf} className="btn btn--sm">
            {isExportingPdf ? "Membuat PDF..." : "📄 Export PDF"}
          </button>
        )}
      </div>

      {error && <p className="callout callout--error" style={{ marginTop: 14 }}>{error}</p>}

      {!storyboard && (
        <div className="panel panel--dashed empty-state" style={{ marginTop: 20 }}>
          Konten ini belum punya storyboard.
          <div style={{ marginTop: 12 }}>
            <button onClick={handleCreateStoryboard} className="btn btn--primary">
              + Buat Storyboard
            </button>
          </div>
        </div>
      )}

      {storyboard && (
        <div style={{ marginTop: 20 }}>
          <StoryboardEditor storyboard={storyboard} onChanged={load} />
        </div>
      )}
    </div>
  );
}