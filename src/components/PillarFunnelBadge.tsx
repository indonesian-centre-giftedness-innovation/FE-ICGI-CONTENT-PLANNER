import type { ContentPillar } from "../lib/api";

export const PILLAR_LABEL: Record<ContentPillar, string> = {
  edukasi: "Edukasi",
  hiburan: "Hiburan",
  promosi: "Promosi",
};

export const PILLAR_COLOR: Record<ContentPillar, string> = {
  edukasi: "var(--blue)",
  hiburan: "var(--pink)",
  promosi: "var(--green)",
};

export function PillarBadge({ pillar }: { pillar: ContentPillar | null }) {
  if (!pillar) return <span className="text-muted">-</span>;
  return (
    <span className="stamp" style={{ fontSize: 10, color: PILLAR_COLOR[pillar] }}>
      {PILLAR_LABEL[pillar]}
    </span>
  );
}