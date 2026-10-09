import type { Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Aurora, ChevronLines, SpeedStripes } from "@/components/brand/graphics";
import { KineticText } from "@/components/motion/kinetic";

export const viewport: Viewport = { themeColor: "#081018" };

export default function NotFound() {
  return (
    <main className="relative isolate mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden bg-navy px-6 pb-[calc(1.5rem+var(--sab))] pt-[calc(1.5rem+var(--sat))] text-white">
      <Aurora />
      <ChevronLines className="animate-fade-slide-left absolute -right-40 top-[20%] h-[60%] w-auto opacity-50" count={8} />
      <SpeedStripes animated fade className="absolute -bottom-2 -left-2 w-60" />
      <Link href="/" aria-label="Riadha home" className="relative">
        <Logo variant="compact" theme="dark" size={24} />
      </Link>
      <div className="relative my-auto">
        <p className="animate-fade-slide-up text-[11px] font-semibold uppercase tracking-[0.18em] text-green">404 · Offside</p>
        <p className="animate-scale-in mt-2 text-[120px] font-bold leading-[0.85] tracking-[-0.06em] text-mark">404</p>
        <KineticText as="h1" text="Nothing here." delay={200} className="mt-3 text-[40px] font-bold leading-none tracking-[-0.04em]" />
        <p className="animate-fade-slide-up ad-500 mt-3 text-white/70">That page or profile doesn&apos;t exist, or it was removed.</p>
        <div className="animate-fade-slide-up ad-600 mt-7 flex flex-wrap gap-2">
          <Link href="/feed" className="btn btn-accent">Go to home</Link>
          <Link href="/discover" className="btn btn-ghost-light">Discover athletes</Link>
        </div>
      </div>
    </main>
  );
}
