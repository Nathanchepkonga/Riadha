import { Shirt } from "@/components/ui/brand";
import { cn, surname } from "@/lib/format";

/** Fixture difficulty in brand colours: green (easy) → navy (hard). */
export const FDR_BG: Record<number, string> = {
  1: "bg-green text-navy",
  2: "bg-[#DDF8AE] text-navy",
  3: "bg-gray-200 text-navy",
  4: "bg-gray-500 text-white",
  5: "bg-navy text-white ring-1 ring-white/30",
};

export type ChipState = "normal" | "selected" | "eligible" | "dimmed" | "ghost";

export function PlayerChip({
  name,
  primary,
  secondary,
  sub,
  subTone = "accent",
  captain,
  vice,
  state = "normal",
  onClick,
  badge,
  label,
}: {
  name: string;
  primary: string;
  secondary: string;
  sub?: React.ReactNode;
  subTone?: "accent" | "dark" | "fdr1" | "fdr2" | "fdr3" | "fdr4" | "fdr5";
  captain?: boolean;
  vice?: boolean;
  state?: ChipState;
  onClick?: () => void;
  badge?: React.ReactNode;
  label?: string;
}) {
  const Tag = onClick ? "button" : "div";
  const tone =
    subTone === "accent" ? "bg-green text-navy" : subTone === "dark" ? "bg-white/15 text-white" : FDR_BG[Number(subTone.slice(3))];
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick, "aria-label": label ?? name } : {})}
      className={cn(
        "relative flex w-[66px] flex-col items-center gap-0.5 rounded-lg p-0.5 transition-[opacity,transform]",
        onClick && "active:scale-95",
        state === "selected" && "bg-white/20 ring-2 ring-green",
        state === "eligible" && "bg-white/15 outline-2 outline-dashed outline-white/80 animate-live",
        state === "dimmed" && "opacity-35",
        state === "ghost" && "opacity-40 grayscale",
      )}
    >
      <Shirt primary={primary} secondary={secondary} size={36} captain={captain} vice={vice} />
      <span className="max-w-full truncate rounded-[4px] bg-white px-1.5 py-px text-[10.5px] font-semibold text-navy">{surname(name)}</span>
      {sub !== undefined && <span className={cn("rounded-[3px] px-1 text-[9.5px] font-semibold leading-[1.4] tabular", tone)}>{sub}</span>}
      {badge}
    </Tag>
  );
}

export function EmptyChip({ label, onClick, state = "normal" }: { label: string; onClick?: () => void; state?: ChipState }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-[66px] flex-col items-center gap-0.5 rounded-lg p-0.5 active:scale-95",
        state === "selected" && "bg-white/20 ring-2 ring-green",
      )}
      aria-label={`Add ${label}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-dashed border-green/70 text-lg font-bold text-green">+</span>
      <span className="rounded-[4px] bg-white/15 px-1.5 py-px text-[10.5px] font-semibold text-white">{label}</span>
    </button>
  );
}

/** Floodlit navy pitch with electric-green markings. Children are rows (GK → FWD). */
export function Pitch({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("relative flex flex-col justify-around overflow-hidden rounded-3xl px-1 py-4", className)}
      style={{ background: "radial-gradient(80% 60% at 50% 45%, rgba(56,103,255,.18), transparent 70%), repeating-linear-gradient(180deg,#0c1520 0 44px,#081018 44px 88px)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-lg border-[1.5px] border-green/35" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-green/30" />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-1/2 h-[1.5px] bg-green/30" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-3 h-12 w-40 -translate-x-1/2 rounded-b-lg border-[1.5px] border-t-0 border-green/35" />
      <div aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 h-12 w-40 -translate-x-1/2 rounded-t-lg border-[1.5px] border-b-0 border-green/35" />
      {children}
    </div>
  );
}

export function PitchRow({ children }: { children: React.ReactNode }) {
  return <div className="relative z-[1] flex justify-evenly">{children}</div>;
}

export function Bench({ children, title = "Bench" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="mt-2 rounded-3xl bg-navy-2 px-2 pb-3 pt-2">
      <p className="kicker mb-1 text-center text-[10px] text-white/60">{title}</p>
      <div className="flex justify-evenly">{children}</div>
    </div>
  );
}
