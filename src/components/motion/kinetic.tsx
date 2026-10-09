import { cn } from "@/lib/format";

/**
 * Headline whose words rise out of their own masks when scrolled into view. Pass plain text; wrap a
 * phrase in `*asterisks*` to highlight it (navy surfaces only: the highlight uses the mark gradient).
 */
export function KineticText({
  text,
  as: Tag = "h2",
  className,
  delay = 0,
  highlightClassName = "text-mark",
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  delay?: number;
  highlightClassName?: string;
}) {
  let i = 0;
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Tag className={cn("kinetic", className)} data-reveal="kinetic" style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties} aria-label={text.replace(/\*/g, "")}>
      {parts.map((part, p) => {
        const hot = part.startsWith("*");
        const words = (hot ? part.slice(1, -1) : part).split(/(\s+)/);
        return words.map((w, k) =>
          /^\s+$/.test(w) || !w ? (
            w && " "
          ) : (
            <span key={`${p}-${k}`} className="kw" aria-hidden>
              <span className={hot ? highlightClassName : undefined} style={{ "--i": i++ } as React.CSSProperties}>
                {w}
              </span>
            </span>
          ),
        );
      })}
    </Tag>
  );
}
