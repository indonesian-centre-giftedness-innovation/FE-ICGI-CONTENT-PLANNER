import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type Storyboard } from "../lib/api";
import { StoryboardEditor } from "../components/StoryboardEditor";

export function StoryboardStandalonePage() {
  const { storyboardId } = useParams<{ storyboardId: string }>();

  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [scriptText, setScriptText] = useState("");

  async function load(isInitial = false) {
    if (!storyboardId) return;
    if (isInitial) setIsLoading(true);
    setError(null);
    try {
      setStoryboard(await api.getStoryboardById(storyboardId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat storyboard");
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyboardId]);

  // Naskah/script manual disimpan lokal per storyboard supaya tidak hilang
  // saat halaman di-refresh (murni catatan tempel-sendiri, bukan data terkirim ke server).
  useEffect(() => {
    if (!storyboardId) return;
    setScriptText(localStorage.getItem(`storyboard-script:${storyboardId}`) || "");
  }, [storyboardId]);

  function handleScriptChange(value: string) {
    setScriptText(value);
    if (storyboardId) localStorage.setItem(`storyboard-script:${storyboardId}`, value);
  }

  async function handleExportPdf() {
    if (!storyboardId) return;
    setIsExportingPdf(true);
    setError(null);
    try {
      await api.exportStoryboardPdf(storyboardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (isLoading) return <p className="text-muted">Memuat...</p>;
  if (!storyboard) return <p className="callout callout--error">{error || "Storyboard tidak ditemukan"}</p>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <p style={{ marginBottom: 4 }}>
        <Link to="/storyboard">&larr; Kembali ke daftar storyboard</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="eyebrow">Rencana Produksi · Standalone</span>
          <h1 style={{ marginBottom: 0 }}>{storyboard.title || "Storyboard tanpa judul"}</h1>
        </div>
        <div className="btn-row">
          <button
            type="button"
            onClick={() => setShowScript((v) => !v)}
            className={`btn btn--sm${showScript ? " btn--primary" : ""}`}
          >
            📝 Script
          </button>
          <button onClick={handleExportPdf} disabled={isExportingPdf} className="btn btn--sm">
            {isExportingPdf ? "Membuat PDF..." : "📄 Export PDF"}
          </button>
        </div>
      </div>
      <p className="text-muted" style={{ marginTop: 6, marginBottom: 20 }}>
        Storyboard ini tidak terikat draft konten mana pun.
      </p>

      {error && <p className="callout callout--error">{error}</p>}

      <StoryboardEditor
        storyboard={storyboard}
        onChanged={load}
        manualScriptVisible={showScript}
        manualScriptText={scriptText}
        onManualScriptChange={handleScriptChange}
      />
    </div>
  );
}