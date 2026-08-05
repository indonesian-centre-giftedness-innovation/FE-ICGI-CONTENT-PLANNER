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

/** Render banyak pillar sekaligus (konten sekarang bisa punya lebih dari 1 pillar). */
export function PillarBadgeList({ pillars }: { pillars: ContentPillar[] | null | undefined }) {
  if (!pillars || pillars.length === 0) return <span className="text-muted">-</span>;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {pillars.map((p) => (
        <span key={p} className="stamp" style={{ fontSize: 10, color: PILLAR_COLOR[p] }}>
          {PILLAR_LABEL[p]}
        </span>
      ))}
    </span>
  );
}