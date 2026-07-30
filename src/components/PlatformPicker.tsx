export const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube", "Newsletter", "Website"] as const;

export function PlatformPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (platform: string) => void;
}) {
  return (
    <div className="btn-row" style={{ flexWrap: "wrap" }}>
      {PLATFORM_OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? "" : p)}
          className={`btn btn--sm ${value === p ? "btn--primary" : ""}`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}