import type { Viewport } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getNextGameweek } from "@/lib/fantasy/engine";
import { Logo, Slogan } from "@/components/brand/logo";
import { ChevronPattern, HeroSlash } from "@/components/brand/graphics";
import { MenuButton } from "@/components/shell/menu";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { AthleteScreen, ClubScreen, PointsScreen } from "@/components/landing/screens";

// The landing page opens on the navy hero, so the status/address bar is navy too.
export const viewport: Viewport = { themeColor: "#081018" };

const PILLARS = [
  { k: "Habit", t: "Riadha Fantasy", d: "FPL-style game for the Kenyan Premier League. KSh budget, private leagues for your office, chama or estate.", live: true },
  { k: "Identity", t: "Showcase", d: "Post clips and stats from any sport. Verified numbers outrank likes, so talent rises.", live: true },
  { k: "Revenue", t: "Scout Desk", d: "Search, percentile radars and shortlists for recruiters. Contact always goes through clubs and guardians.", live: false },
  { k: "Belonging", t: "Clubs & Crews", d: "Pages for running crews, teams and fan groups, with events, RSVPs and chat.", live: false },
];

export default async function Landing() {
  const [user, next] = await Promise.all([getCurrentUser(), getNextGameweek(db)]);
  const cta = user ? { href: user.onboarded ? "/feed" : "/onboarding", label: "Open Riadha" } : { href: "/login", label: "Get started" };
  const phones = [
    { el: <AthleteScreen />, delay: "ad-300", extra: "" },
    { el: <PointsScreen />, delay: "ad-500", extra: "md:-mb-6" },
    { el: <ClubScreen />, delay: "ad-700", extra: "" },
  ];

  return (
    <div className="bg-offwhite">
      {/* ── Hero cover (design/brand/01) ── */}
      <section className="safe-top relative overflow-hidden bg-navy text-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand photography from design/brand */}
        <img src="/brand/stadium-track.jpg" alt="" className="absolute inset-y-0 right-0 hidden h-full w-[46%] object-cover md:block" />
        <div className="absolute inset-y-0 right-0 hidden w-[46%] bg-gradient-to-r from-navy via-navy/40 to-transparent md:block" />
        <HeroSlash className="animate-slash-in ad-200 -top-10 bottom-0 left-[50%] hidden w-24 md:block" />

        <header className="relative z-10 mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          <Logo variant="compact" theme="dark" size={26} />
          <div className="flex items-center gap-2">
            <Link href={cta.href} className="btn btn-accent btn-sm">{cta.label}</Link>
            <MenuButton user={user ? { handle: user.handle, isAdmin: user.isAdmin } : null} tone="light" />
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-[1200px] px-5 pb-14 pt-10 md:pb-24 md:pt-16">
          <div className="animate-fade-slide-up">
            <Logo variant="primary" theme="dark" size="clamp(40px, 14vw, 88px)" />
          </div>
          <Slogan light className="animate-fade-slide-up ad-200 mt-6 text-[18px] md:text-[22px]" />
          <p className="animate-fade-slide-up ad-300 mt-4 max-w-[46ch] text-[15px] text-white/70">
            Fantasy football for the Kenyan Premier League, a showcase for every Kenyan athlete, and a home for clubs and crews.
          </p>
          <div className="animate-fade-slide-up ad-400 mt-7 flex flex-wrap gap-2">
            <Link href={cta.href} className="btn btn-accent btn-lg">
              {cta.label} <ArrowRight size={16} />
            </Link>
            <Link href="/u/faithchebet" className="btn btn-ghost-light btn-lg">See an athlete page</Link>
          </div>
        </div>
      </section>

      {/* ── App preview ── */}
      <section className="relative overflow-hidden bg-navy pb-6">
        <div className="relative z-10 hidden w-full items-end justify-center gap-[2vw] pb-10 md:flex">
          {phones.map((p, i) => (
            <PhoneMockup key={i} className={`animate-fade-slide-up ${p.delay} ${p.extra}`}>{p.el}</PhoneMockup>
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center gap-[50px] px-5 pb-10 md:hidden">
          {phones.map((p, i) => (
            <PhoneMockup key={i} className={`animate-fade-slide-up ${p.delay}`}>{p.el}</PhoneMockup>
          ))}
        </div>
      </section>

      {/* ── Pillars ── */}
      <section className="mx-auto max-w-[1120px] px-5 pb-16 pt-16">
        <p className="kicker">The product</p>
        <h2 className="h1 mt-2">Four rooms, one house</h2>
        <div className="mt-8 grid border-t-[3px] border-navy sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.t} className="border-b border-line py-6 pr-6 sm:border-r sm:pl-6 sm:[&:nth-child(odd)]:pl-0 lg:border-b-0 lg:[&:nth-child(odd)]:pl-6 lg:first:pl-0 lg:last:border-r-0">
              <p className="kicker text-cobalt">{p.k}</p>
              <h3 className="h4 mt-2 flex items-center gap-2">
                {p.t}
                {!p.live && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold tracking-normal text-muted">Soon</span>}
              </h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA band on the brand pattern (design/brand/16) ── */}
      <section className="mx-auto max-w-[1120px] px-5 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-navy text-white">
          <ChevronPattern className="absolute inset-0 h-full w-full opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/20" />
          <div className="relative flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <p className="h2 max-w-[18ch]">{next ? `Gameweek ${next.id} deadline is coming.` : "New season soon."} Is your XI ready?</p>
            <Link href={cta.href} className="btn btn-accent btn-lg shrink-0">{cta.label}</Link>
          </div>
        </div>
      </section>

      {/* ── Bottom brand lockup (design/brand/18) ── */}
      <footer className="safe-bottom bg-navy">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start gap-4 px-5 py-8 md:flex-row md:items-center md:justify-between">
          {/* Visibility lives on wrappers: the lockup's own inline-flex would beat a `hidden` class. */}
          <div className="hidden md:block"><Logo variant="horizontal" theme="dark" size={26} /></div>
          <div className="md:hidden"><Logo variant="primary" theme="dark" size={28} /></div>
          <p className="text-xs text-white/50">Made in Kenya · Player, athlete and club data shown is illustrative.</p>
        </div>
      </footer>
    </div>
  );
}
