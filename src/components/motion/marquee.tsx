import { cn } from "@/lib/format";

/** Endless horizontal ticker. Content is rendered twice so the loop is seamless; the copy is hidden from screen readers. */
export function Marquee({ children, className, speed = 32, gap = "2.5rem" }: { children: React.ReactNode; className?: string; speed?: number; gap?: string }) {
  const style = { "--marquee-speed": `${speed}s`, "--marquee-gap": gap } as React.CSSProperties;
  return (
    <div className={cn("marquee", className)} style={style}>
      <div className="marquee-track">{children}</div>
      <div className="marquee-track" aria-hidden>
        {children}
      </div>
    </div>
  );
}
