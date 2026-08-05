import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Content } from "../lib/api";

export function ImageGeneratePickerPage() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .listContents()
      .then(setContents)
      .catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat konten"))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = contents.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 700 }}>
      <span className="eyebrow">Produksi</span>
      <h1 style={{ marginBottom: 4 }}>Generate Gambar dengan AI</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Pilih konten yang mau dibuatkan gambar. Hasilnya otomatis tersimpan di Media & Review konten itu.
      </p>

      <input
        type="text"
        placeholder="Cari konten..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
        style={{ marginBottom: 16 }}
      />

      {isLoading && <p className="text-muted">Memuat...</p>}
      {error && <p className="callout callout--error">{error}</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state panel panel--dashed">Tidak ada konten yang cocok.</div>
      )}

      <div className="stack stack--sm">
        {filtered.map((c) => (
          <div key={c.id} className="panel panel--flat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 700 }}>{c.title}</span>
            <button onClick={() => navigate(`/content/${c.id}/image`)} className="btn btn--sm btn--blue">
              🖼️ Generate Gambar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}