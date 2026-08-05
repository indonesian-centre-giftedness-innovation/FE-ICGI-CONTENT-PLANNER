export const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "Newsletter", "Website"] as const;

/** Multi-select — konten sekarang bisa dipakai untuk lebih dari satu platform sekaligus. */
export function PlatformPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (platforms: string[]) => void;
}) {
  function toggle(p: string) {
    if (value.includes(p)) {
      onChange(value.filter((v) => v !== p));
    } else {
      onChange([...value, p]);
    }
  }

  return (
    <div className="btn-row" style={{ flexWrap: "wrap" }}>
      {PLATFORM_OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => toggle(p)}
          className={`btn btn--sm ${value.includes(p) ? "btn--primary" : ""}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}