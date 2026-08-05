import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function base64ToFile(base64: string, mimeType: string, fileName: string): File {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

export function ImageGeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{ imageBase64: string; mimeType: string } | null>(null);
  const [revisionText, setRevisionText] = useState("");
  const [isRevising, setIsRevising] = useState(false);

  const [fileName, setFileName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setSaveNotice(null);
    try {
      const res = await api.generateStandaloneImage({ prompt: prompt.trim(), referenceFile: referenceFile || undefined });
      setResult(res);
      setFileName(`ai-generated-${Date.now()}.${res.mimeType.split("/")[1] || "png"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate gambar lewat AI");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevise() {
    if (!result || !revisionText.trim()) return;
    setIsRevising(true);
    setError(null);
    setSaveNotice(null);
    try {
      // hasil sebelumnya dipakai sebagai gambar referensi, supaya revisi tetap nyambung
      const prevAsFile = base64ToFile(result.imageBase64, result.mimeType, "previous.png");
      const combinedPrompt = `${prompt.trim()}\n\nRevisi dari gambar sebelumnya: ${revisionText.trim()}`;
      const res = await api.generateStandaloneImage({ prompt: combinedPrompt, referenceFile: prevAsFile });
      setResult(res);
      setFileName(`ai-generated-${Date.now()}.${res.mimeType.split("/")[1] || "png"}`);
      setRevisionText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal revisi gambar lewat AI");
    } finally {
      setIsRevising(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setIsSaving(true);
    setError(null);
    setSaveNotice(null);
    try {
      await api.saveGeneratedImage({
        imageBase64: result.imageBase64,
        mimeType: result.mimeType,
        fileName: fileName.trim() || undefined,
      });
      setSaveNotice("Gambar tersimpan ke Media, menunggu approve.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan gambar ke Media");
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartOver() {
    setResult(null);
    setPrompt("");
    setReferenceFile(null);
    setRevisionText("");
    setSaveNotice(null);
    setError(null);
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <span className="eyebrow">Produksi</span>
      <h1 style={{ marginBottom: 4 }}>Generate Gambar dengan AI</h1>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Standalone — tidak terikat ke draft/konten mana pun. Gambar yang kamu simpan masuk ke <Link to="/media">Media</Link> menunggu approve.
      </p>

      {!result && (
        <div className="panel">
          <label className="field">
            <span className="field__label">Deskripsikan gambar yang mau dibuat</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="textarea"
              placeholder="Misal: poster promo diskon 50%, warna cerah, gaya flat design..."
            />
          </label>
          <label className="field">
            <span className="field__label">Gambar referensi/gaya (opsional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
              className="input"
            />
            {referenceFile && (
              <span className="text-muted" style={{ fontSize: 12 }}>
                {referenceFile.name}
              </span>
            )}
          </label>

          <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="btn btn--blue">
            {isGenerating ? "Generating..." : "🖼️ Generate Gambar"}
          </button>

          <p className="text-muted" style={{ fontSize: 11, marginTop: 12, marginBottom: 0 }}>
            Catatan: kuota generate gambar gratis lebih ketat dari generate teks. Kalau gagal, coba lagi beberapa saat lagi.
          </p>
        </div>
      )}

      {error && (
        <p className="callout callout--error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      {result && (
        <div className="panel">
          <img
            src={`data:${result.mimeType};base64,${result.imageBase64}`}
            alt="Hasil generate AI"
            style={{ width: "100%", borderRadius: "var(--radius)", border: "var(--border-w) solid var(--ink)", marginBottom: 16 }}
          />

          {saveNotice ? (
            <>
              <p className="callout callout--success">{saveNotice}</p>
              <div className="btn-row">
                <Link to="/media" className="btn btn--primary">
                  Buka Media →
                </Link>
                <button onClick={handleStartOver} className="btn btn--sm">
                  Generate Gambar Lain
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span className="field__label">Nama file</span>
                <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="input" />
              </label>
              <div className="btn-row" style={{ marginBottom: 20 }}>
                <button onClick={handleSave} disabled={isSaving} className="btn btn--primary">
                  {isSaving ? "Menyimpan..." : "💾 Simpan ke Media"}
                </button>
                <button onClick={handleStartOver} className="btn btn--sm">
                  Buang & Mulai Ulang
                </button>
              </div>

              <div className="panel panel--flat" style={{ background: "var(--paper-alt)" }}>
                <span className="eyebrow">Belum sesuai? Revisi</span>
                <p className="text-muted" style={{ fontSize: 12, marginTop: 0, marginBottom: 8 }}>
                  Gambar hasil sekarang dipakai sebagai referensi, tinggal kasih tahu apa yang mau diubah.
                </p>
                <textarea
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                  rows={2}
                  className="textarea"
                  placeholder="Misal: warnanya kurang cerah, tulisan CTA-nya kurang besar..."
                  style={{ marginBottom: 8 }}
                />
                <button
                  onClick={handleRevise}
                  disabled={isRevising || !revisionText.trim()}
                  className="btn btn--blue"
                  style={{ width: "100%" }}
                >
                  {isRevising ? "Merevisi..." : "🔁 Generate Ulang dengan Revisi"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}