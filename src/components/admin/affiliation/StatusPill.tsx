import { UiBadge, type UiBadgeProps } from "@/components/ui/badge";

const STATUS_TONE_MAP: Record<string, UiBadgeProps["tone"]> = {
  active: "trust",
  processed: "trust",
  confirmed: "trust",
  paid: "accent",
  committed: "trust",
  recorded: "trust",
  replay: "accent",
  pending: "warning",
  received: "neutral",
  duplicate: "neutral",
  unattributed: "warning",
  inactive: "neutral",
  archived: "neutral",
  rejected: "danger",
  failed: "danger",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <UiBadge tone={STATUS_TONE_MAP[status] ?? "neutral"}>{label ?? status}</UiBadge>;
}
