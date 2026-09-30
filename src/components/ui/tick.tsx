import type { Role } from "@/db/schema";
import { cn } from "@/lib/format";

// Tick colours are reserved for verification: cobalt = athlete, electric green = club, gray = scout.
const TICK: Partial<Record<Role, { bg: string; check: string; label: string }>> = {
  athlete: { bg: "bg-cobalt", check: "#fff", label: "Verified athlete" },
  club: { bg: "bg-green", check: "#081018", label: "Verified club" },
  scout: { bg: "bg-gray-500", check: "#fff", label: "Verified scout" },
};

export function tickLabel(role: Role) {
  return TICK[role]?.label ?? "Fan";
}

/** Verification tick. */
export function Tick({ role, verified, size = 16, className }: { role: Role; verified: boolean; size?: number; className?: string }) {
  const t = TICK[role];
  if (!verified || !t) return null;
  return (
    <span
      role="img"
      aria-label={t.label}
      title={t.label}
      className={cn("inline-grid shrink-0 place-items-center rounded-full align-[-0.15em]", t.bg, className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" width={size * 0.62} height={size * 0.62} aria-hidden>
        <path d="M3.5 8.3l2.9 2.9 6-6.2" fill="none" stroke={t.check} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
