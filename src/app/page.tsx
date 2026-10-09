import type { Viewport } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { ArrowDown, ArrowRight, ArrowUpRight, Clapperboard, Radar, Shirt, Store, UserRound, UsersRound } from "lucide-react";
import { db } from "@/db";
import { businesses, communities, fantasyEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";
import { getNextGameweek } from "@/lib/fantasy/engine";
import { countdown, formatKickoff } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { Aurora, ChevronLines, ChevronPattern, SpeedStripes } from "@/components/brand/graphics";
import { MenuButton } from "@/components/shell/menu";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { AthleteScreen, ClubScreen, PointsScreen } from "@/components/landing/screens";
import { CountUp } from "@/components/motion/count-up";
import { KineticText } from "@/components/motion/kinetic";
import { Marquee } from "@/components/motion/marquee";
import { Tilt } from "@/components/motion/tilt";
import { cn } from "@/lib/format";

// The landing page opens on the navy hero, so the status/address bar is navy too.
export const viewport: Viewport = { themeColor: "#081018" };

const MODULES = [
  {
    n: "01",
    name: "Riadha Fantasy",
    title: "Pick your XI.",
    body: "The Kenyan Premier League as a fantasy game. KSh budget, captains, transfers and private leagues for your office, chama or estate.",
    points: ["Live gameweek scoring", "Private leagues with invite codes", "Auto-subs and chips"],
    icon: Shirt,
    href: "/fantasy",
    tone: "navy",
  },
  {
    n: "02",
    name: "Watch",
    title: "Swipe the best of Kenyan sport.",
    body: "A full-screen vertical feed of runs, goals, rallies and records. Follow athletes in one tap and keep the conversation going in the comments.",
    points: ["Autoplay reels", "Comments and shares", "For you and Following"],
    icon: Clapperboard,
    href: "/watch",
    tone: "cobalt",
  },
  {
    n: "03",
    name: "Athlete profiles",
    title: "Post your run.",
    body: "A portfolio for every athlete: video highlights, verified stats, bio, skills and availability. Minors are protected: contact goes to guardians and clubs.",
    points: ["Club-verified numbers", "Skills, height, preferred side", "Open to opportunities"],
    icon: UserRound,
    href: "/u/faithchebet",
    tone: "green",
  },
  {
    n: "04",
    name: "Scout portal",
    title: "Get scouted. Anywhere in Kenya.",
    body: "Scouts and coaches search all 47 counties by sport, age, position and skill, then build a shortlist from first look to signing.",
    points: ["Filters by age, county, skill", "Shortlist pipeline with notes", "Willing-to-relocate talent"],
    icon: Radar,
    href: "/scout",
    tone: "white",
  },
  {
    n: "05",
    name: "Communities",
    title: "Find your crew.",
    body: "From Nairobi Morning Run to a U17 tournament or the chess club: group chat, events and RSVPs in one place.",
    points: ["Group chat", "Events with RSVP and calendar", "Captains and admins"],
    icon: UsersRound,
    href: "/communities",
    tone: "navy",
  },
  {
    n: "06",
    name: "Marketplace",
    title: "Gear up. Train smarter.",
    body: "Gyms, academies, sports shops and physios list their amenities and reach the athletes who need them, by sport, county and age.",
    points: ["Verified local businesses", "Targeted ads for athletes", "Call or WhatsApp in a tap"],
    icon: Store,
    href: "/market",
    tone: "cobalt",
  },
] as const;

const TONE = {
  navy: { card: "bg-navy text-white", kicker: "text-green", body: "text-white/70", rule: "border-white/12", cta: "btn-accent", icon: "bg-green text-navy" },
  cobalt: { card: "bg-cobalt text-white", kicker: "text-white/80", body: "text-white/80", rule: "border-white/20", cta: "btn-light", icon: "bg-white text-cobalt" },
  green: { card: "bg-green text-navy", kicker: "text-navy/70", body: "text-navy/75", rule: "border-navy/15", cta: "btn-primary", icon: "bg-navy text-green" },
  white: { card: "bg-surface text-navy ring-1 ring-line", kicker: "text-cobalt", body: "text-muted", rule: "border-line", cta: "btn-primary", icon: "bg-navy text-green" },
} as const;

async function stats() {
  const [[a], [c], [b], [f]] = await Promise.all([
    db.select({ n: count() }).from(users).where(eq(users.role, "athlete")),
    db.select({ n: count() }).from(communities),
    db.select({ n: count() }).from(businesses).where(eq(businesses.active, true)),
    db.select({ n: count() }).from(fantasyEntries),
  ]);
  return { athletes: a.n, communities: c.n, businesses: b.n, managers: f.n };
}

export default async function Landing() {
  const [user, next, s] = await Promise.all([getCurrentUser(), getNextGameweek(db), stats()]);
  const cta = user ? { href: user.onboarded ? "/feed" : "/onboarding", label: "Open Riadha" } : { href: "/login", label: "Get started" };
  const menuUser = user ? { handle: user.handle, isAdmin: user.isAdmin, canScout: canScout(user) } : null;
  const phones = [
    { el: <AthleteScreen />, caption: "Athlete portfolio" },
    { el: <PointsScreen />, caption: "Fantasy points" },
    { el: <ClubScreen />, caption: "Club page" },
  ];
  const tape = ["Sport", "Talent", "Scouting", "Pick your XI", "Post your run", "Get scouted"];

  return (
    <div className="bg-offwhite">
      {/* ───────── Hero ───────── */}
      <section className="safe-top relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-navy text-white">
        <Aurora />
        <ChevronLines className="parallax absolute -right-48 top-[18%] h-[72%] w-auto opacity-50 md:-right-10" count={9} />
        <SpeedStripes animated fade className="absolute -bottom-1 -left-3 w-[78%] max-w-[560px] opacity-90" />

        <header className="relative z-10 mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5">
          <Logo variant="compact" theme="dark" size={24} animated />
          <div className="flex items-center gap-2">
            <Link href={cta.href} className="btn btn-accent btn-sm">{cta.label}</Link>
            <MenuButton user={menuUser} tone="light" />
          </div>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 px-5 pb-28 pt-8 md:grid-cols-[1.05fr_.95fr] md:pb-20">
          <div className="scroll-fade">
            <p className="glass animate-fade-slide-up inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
              <span className="animate-live h-1.5 w-1.5 rounded-full bg-green" />
              {next ? `Gameweek ${next.id} · deadline in ${countdown(next.deadline)}` : "Kenya's sports super-app"}
            </p>
            <KineticText as="h1" text="Find the *next star.*" delay={250} className="mt-6 text-[clamp(46px,13.5vw,96px)] font-bold leading-[0.92] tracking-[-0.05em]" />
            <p className="animate-fade-slide-up ad-700 mt-5 text-[clamp(18px,4.8vw,24px)] font-semibold tracking-[-0.01em]">Kenyan talent, seen and scouted.</p>
            <p className="animate-fade-slide-up ad-800 mt-3 max-w-[44ch] text-[15px] leading-relaxed text-white/65">
              Post your runs, build your XI and get noticed by clubs and scouts. Find your crew and the gyms, academies and physios near you.
            </p>
            <div className="animate-fade-slide-up ad-900 mt-8 flex flex-wrap items-center gap-2">
              <Link href={cta.href} className="btn btn-accent btn-lg">
                {cta.label} <ArrowRight size={16} />
              </Link>
              <Link href="/u/faithchebet" className="btn btn-ghost-light btn-lg">See an athlete</Link>
            </div>
            <dl className="animate-fade-slide-up ad-1000 mt-10 grid max-w-[460px] grid-cols-3 gap-2">
              {[
                [s.athletes, "Athletes"],
                [s.managers, "Managers"],
                [s.communities, "Crews"],
              ].map(([n, l]) => (
                <div key={l} className="glass rounded-2xl px-3 py-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{l}</dt>
                  <dd className="mt-1 text-[26px] font-bold leading-none tracking-[-0.04em] tabular">
                    <CountUp to={Number(n)} duration={1800} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Desktop: the app, tilting under the pointer */}
          <div className="relative hidden h-full items-center justify-center md:flex">
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgba(183,243,74,.25),transparent)] blur-2xl" aria-hidden />
            <Tilt className="hero-phone animate-scale-in ad-400 rounded-[54px]" max={9}>
              {/* A fresh element: reusing phones[0].el would make RSC share its SVG gradient ids */}
              <PhoneMockup>
                <AthleteScreen />
              </PhoneMockup>
            </Tilt>
          </div>
        </div>

        <a href="#tour" className="animate-fade-in ad-1000 absolute bottom-[calc(1.25rem+var(--sab))] left-1/2 z-10 grid -translate-x-1/2 place-items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Scroll
          <span className="grid h-9 w-6 place-items-start justify-center rounded-full ring-1 ring-white/25">
            <ArrowDown size={12} className="mt-1.5 animate-bounce" />
          </span>
        </a>
      </section>

      {/* ───────── Crossing tapes ───────── */}
      <div className="relative z-10 -mt-6 h-28 overflow-hidden md:h-32" aria-hidden>
        <Marquee speed={40} className="absolute inset-x-[-5%] top-6 -rotate-[3deg] bg-cobalt py-3 text-white">
          {tape.map((t) => (
            <span key={t} className="flex items-center gap-10 text-[15px] font-bold uppercase tracking-[0.18em]">
              {t}
              <span className="h-2 w-4 -skew-x-[37.57deg] bg-white/70" />
            </span>
          ))}
        </Marquee>
        <Marquee speed={30} className="absolute inset-x-[-5%] top-10 rotate-[2deg] bg-green py-3 text-navy shadow-[0_10px_30px_-10px_rgba(8,16,24,.4)]">
          {tape.map((t) => (
            <span key={t} className="flex items-center gap-10 text-[15px] font-bold uppercase tracking-[0.18em]">
              {t}
              <span className="h-2 w-4 -skew-x-[37.57deg] bg-navy" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* ───────── App tour ───────── */}
      <section id="tour" className="relative scroll-mt-4 overflow-hidden pb-6 pt-12">
        <div className="mx-auto max-w-[1120px] px-5">
          <p className="kicker" data-reveal="fade">The app</p>
          <KineticText text="One app for the whole game." className="h1 mt-2 max-w-[16ch]" />
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-[max(1.25rem,calc(50vw-560px))] pb-8 md:justify-center" data-stagger="120">
          {phones.map((p) => (
            <figure key={p.caption} data-reveal="up" className="shrink-0 snap-center">
              <Tilt className="rounded-[54px]">
                <PhoneMockup>{p.el}</PhoneMockup>
              </Tilt>
              <figcaption className="mt-4 text-center text-[13px] font-semibold text-muted">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ───────── Six modules, stacking as you scroll ───────── */}
      <section className="mx-auto max-w-[1120px] px-4 pb-10 pt-6 md:px-5">
        <div className="px-1">
          <p className="kicker" data-reveal="fade">Everything in one place</p>
          <KineticText text="Six rooms, one house." className="h1 mt-2" />
        </div>
        <div className="mt-8 flex flex-col gap-5">
          {MODULES.map((m, i) => {
            const t = TONE[m.tone];
            const Icon = m.icon;
            return (
              <article
                key={m.n}
                className={cn("sticky overflow-hidden rounded-[28px] p-6 shadow-[0_-12px_40px_-18px_rgba(8,16,24,.45)] md:p-10", t.card)}
                style={{ top: `calc(1rem + var(--sat) + ${i * 14}px)` }}
              >
                {m.tone !== "white" && m.tone !== "green" && <ChevronLines className="pointer-events-none absolute -right-28 -top-10 h-[130%] w-auto opacity-40" count={6} color={m.tone === "cobalt" ? "#FFFFFF" : "#3867FF"} opacity={m.tone === "cobalt" ? 0.18 : 0.35} />}
                {m.tone === "green" && <ChevronLines className="pointer-events-none absolute -right-28 -top-10 h-[130%] w-auto" count={6} color="#081018" opacity={0.12} />}
                <div className="relative grid gap-6 md:grid-cols-[1fr_.8fr] md:items-end">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className={cn("grid h-11 w-11 place-items-center rounded-xl", t.icon)}>
                        <Icon size={22} strokeWidth={2.2} />
                      </span>
                      <p className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", t.kicker)}>
                        {m.n} · {m.name}
                      </p>
                    </div>
                    <h3 className="mt-6 text-[clamp(30px,8vw,52px)] font-bold leading-[1] tracking-[-0.04em]">{m.title}</h3>
                    <p className={cn("mt-4 max-w-[52ch] text-[15px] leading-relaxed", t.body)}>{m.body}</p>
                  </div>
                  <div>
                    <ul className={cn("border-t", t.rule)}>
                      {m.points.map((p) => (
                        <li key={p} className={cn("flex items-center gap-3 border-b py-2.5 text-[14px] font-semibold", t.rule)}>
                          <span className="h-2 w-3 shrink-0 -skew-x-[37.57deg] bg-current opacity-60" />
                          {p}
                        </li>
                      ))}
                    </ul>
                    <Link href={user ? m.href : cta.href} className={cn("btn btn-sm mt-5", t.cta)}>
                      {user ? "Open" : "Try it"} <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ───────── Statement + numbers ───────── */}
      <section className="relative isolate overflow-hidden bg-navy py-20 text-white md:py-28">
        <Aurora intensity={0.7} stripes={false} />
        <ChevronLines className="parallax absolute -left-40 top-0 h-full w-auto opacity-40" count={7} />
        <div className="relative mx-auto max-w-[1120px] px-5">
          <KineticText text="Every lap. Every goal. Every rep. *Seen.*" className="max-w-[14ch] text-[clamp(40px,11vw,88px)] font-bold leading-[0.95] tracking-[-0.045em]" />
          <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4" data-stagger="110">
            {[
              [s.athletes, "Athletes showcasing"],
              [s.managers, "Fantasy managers"],
              [s.communities, "Communities"],
              [s.businesses, "Sports businesses"],
            ]
              .filter(([n]) => Number(n) > 0)
              .map(([n, l], i) => (
              <div key={l} data-reveal="up" className="border-t border-white/15 pt-4">
                <dd className={cn("text-[clamp(44px,12vw,72px)] font-bold leading-none tracking-[-0.05em] tabular", i === 0 && "text-mark")}>
                  <CountUp to={Number(n)} delay={i * 120} />
                </dd>
                <dt className="mt-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/55">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───────── CTA on the brand pattern ───────── */}
      <section className="mx-auto max-w-[1120px] px-4 py-14 md:px-5">
        <div data-reveal="scale" className="relative overflow-hidden rounded-[28px] bg-navy text-white">
          <ChevronPattern className="absolute inset-0 h-full w-full opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/10" />
          <div className="relative flex flex-col items-start gap-6 p-7 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <p className="kicker text-green">{next ? `Gameweek ${next.id} · ${formatKickoff(next.deadline)}` : "Season loading"}</p>
              <p className="h2 mt-2 max-w-[16ch]">{next ? `Deadline in ${countdown(next.deadline)}.` : "New season soon."} Is your XI ready?</p>
            </div>
            <Link href={cta.href} className="btn btn-accent btn-lg shrink-0">
              {cta.label} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Footer: the kit's footer lockup ───────── */}
      <footer className="safe-bottom relative overflow-hidden bg-navy text-white">
        <div className="flex h-1.5" aria-hidden>
          <span className="w-[16%] bg-green" />
          <span className="ml-[2.5%] w-[14%] bg-cobalt" />
          <span className="ml-[2.5%] w-[5%] bg-green" />
          <span className="ml-[2.5%] w-[5%] bg-cobalt" />
        </div>
        <div className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="hidden md:block">
              <Logo variant="horizontal" theme="dark" size={30} />
            </div>
            <div className="md:hidden">
              <Logo variant="stacked" theme="dark" size={34} />
            </div>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-[14px] text-white/70" aria-label="Footer">
            <Link href="/fantasy" className="hover:text-green">Fantasy</Link>
            <Link href="/watch" className="hover:text-green">Watch</Link>
            <Link href="/communities" className="hover:text-green">Communities</Link>
            <Link href="/market" className="hover:text-green">Marketplace</Link>
            <Link href="/discover" className="hover:text-green">Discover</Link>
            <Link href="/login" className="hover:text-green">Sign in</Link>
          </nav>
        </div>
        <div className="mx-auto flex max-w-[1120px] flex-col gap-2 border-t border-white/10 px-5 py-6 text-xs text-white/45 md:flex-row md:justify-between">
          <p>© Riadha · Sport, Talent, Scouting</p>
          <p>Made in Kenya · Player, athlete and club data shown is illustrative.</p>
        </div>
      </footer>
    </div>
  );
}
