import type { ContentStatus } from "../lib/api";

export const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  pending_review: "Menunggu Review",
  revisi: "Revisi",
  approved: "Approved",
  published: "Published",
};

export function StatusStamp({ status }: { status: ContentStatus }) {
  return <span className={`stamp stamp--${status}`}>{STATUS_LABEL[status]}</span>;
}