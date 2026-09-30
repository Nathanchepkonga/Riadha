import { cn } from "@/lib/format";

// Club identity primitives. The Riadha logo itself lives in components/brand/logo.tsx.

export function ClubBadge({
  short,
  primary,
  secondary,
  size = 40,
  className,
}: {
  short: string;
  primary: string;
  secondary: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold", className)}
      style={{ width: size, height: size, background: primary, color: secondary, fontSize: size * 0.28, boxShadow: `inset 0 0 0 2px ${secondary}40, 0 1px 2px rgb(8 16 24 / .15)` }}
      aria-hidden
    >
      {short}
    </span>
  );
}

/** Football shirt in club colours, with the captain / vice armband. */
export function Shirt({ primary, secondary, size = 40, captain, vice }: { primary: string; secondary: string; size?: number; captain?: boolean; vice?: boolean }) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden>
        <path
          d="M13 4l-9 5 3.5 8 4-2V36h17V15l4 2L36 9l-9-5c-1 2.6-3.8 4.2-7 4.2S14 6.6 13 4z"
          fill={primary}
          stroke="rgba(8,16,24,.35)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M13 4c1 2.6 3.8 4.2 7 4.2s6-1.6 7-4.2" fill="none" stroke={secondary} strokeWidth="2" />
        <path d="M11.5 15v21M28.5 15v21" stroke={secondary} strokeOpacity=".35" strokeWidth="1.2" />
      </svg>
      {(captain || vice) && (
        <span
          className={cn(
            "absolute -right-1.5 -top-1 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ring-2 ring-navy",
            captain ? "bg-green text-navy" : "bg-white text-navy",
          )}
        >
          {captain ? "C" : "V"}
        </span>
      )}
    </span>
  );
}
