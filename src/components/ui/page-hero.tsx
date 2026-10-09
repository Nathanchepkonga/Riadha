import { Aurora, ChevronLines } from "@/components/brand/graphics";
import { KineticText } from "@/components/motion/kinetic";
import { cn } from "@/lib/format";

/**
 * The navy header card that opens each module screen: drifting brand light, chevrons, a kicker and a
 * kinetic title. Wrap a phrase in *asterisks* to light it in the mark gradient.
 */
export function PageHero({
  kicker,
  title,
  body,
  children,
  className,
}: {
  kicker: React.ReactNode;
  title: string;
  body?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative isolate overflow-hidden rounded-[28px] bg-navy p-5 text-white", className)}>
      <Aurora intensity={0.85} />
      <ChevronLines className="parallax pointer-events-none absolute -right-36 -top-6 h-[140%] w-auto opacity-50" count={6} />
      <div className="relative">
        <p className="animate-fade-slide-up text-[11px] font-semibold uppercase tracking-[0.18em] text-green">{kicker}</p>
        <KineticText as="h1" text={title} className="mt-2 text-[clamp(30px,8.6vw,40px)] font-bold leading-[1.02] tracking-[-0.04em]" />
        {body && <p className="animate-fade-slide-up ad-300 mt-2 max-w-[40ch] text-[14px] leading-relaxed text-white/70">{body}</p>}
        {children && <div className="animate-fade-slide-up ad-400 mt-5">{children}</div>}
      </div>
    </section>
  );
}
