import type { ContentPillar } from "../lib/api";
import { PILLAR_LABEL } from "./PillarFunnelBadge";

const PILLAR_OPTIONS = Object.keys(PILLAR_LABEL) as ContentPillar[];

/** Single-select — beda dari PlatformPicker yang sekarang multi-select. */
export function PillarPicker({
  value,
  onChange,
}: {
  value: ContentPillar | "";
  onChange: (pillar: ContentPillar | "") => void;
}) {
  return (
    <div className="btn-row" style={{ flexWrap: "wrap" }}>
      {PILLAR_OPTIONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? "" : p)}
          className={`btn btn--sm ${value === p ? "btn--primary" : ""}`}
        >
          {PILLAR_LABEL[p]}
        </button>
      ))}
    </div>
  );
}