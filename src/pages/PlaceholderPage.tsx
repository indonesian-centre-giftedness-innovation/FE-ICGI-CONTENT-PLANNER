export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <span className="eyebrow">Segera Hadir</span>
      <h1>{title}</h1>
      <div className="empty-state panel panel--dashed">
        Halaman ini akan dikembangkan pada tahap berikutnya.
      </div>
    </div>
  );
}