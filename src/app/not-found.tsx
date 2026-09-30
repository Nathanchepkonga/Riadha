import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SlashStripes } from "@/components/brand/graphics";

export default function NotFound() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col overflow-hidden bg-navy px-6 pb-[calc(1.5rem+var(--sab))] pt-[calc(1.5rem+var(--sat))] text-white">
      <SlashStripes className="absolute -bottom-2 -left-2 w-52" />
      <Logo variant="compact" theme="dark" size={26} />
      <div className="relative my-auto">
        <p className="kicker text-green">404 · Offside</p>
        <h1 className="h1 mt-2">Nothing here</h1>
        <p className="mt-3 text-white/70">That page or profile doesn&apos;t exist, or it was removed.</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/feed" className="btn btn-accent">Go to home</Link>
          <Link href="/discover" className="btn btn-ghost-light">Discover athletes</Link>
        </div>
      </div>
    </main>
  );
}
