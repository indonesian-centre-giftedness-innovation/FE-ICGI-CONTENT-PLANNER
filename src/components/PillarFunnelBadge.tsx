import type { ContentPillar, ContentFunnel } from "../lib/api";

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

export const FUNNEL_LABEL: Record<ContentFunnel, string> = {
  tofu: "TOFU",
  mofu: "MOFU",
  bofu: "BOFU",
};

export function PillarBadge({ pillar }: { pillar: ContentPillar | null }) {
  if (!pillar) return <span className="text-muted">-</span>;
  return (
    <span className="stamp" style={{ fontSize: 10, color: PILLAR_COLOR[pillar] }}>
      {PILLAR_LABEL[pillar]}
    </span>
  );
}

export function FunnelBadge({ funnel }: { funnel: ContentFunnel | null }) {
  if (!funnel) return <span className="text-muted">-</span>;
  return (
    <span className="stamp" style={{ fontSize: 10, color: "var(--ink)" }}>
      {FUNNEL_LABEL[funnel]}
    </span>
  );
}