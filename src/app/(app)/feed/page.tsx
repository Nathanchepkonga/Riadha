import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { Clapperboard, Flame, Radar, Shirt, Store, Timer, UsersRound } from "lucide-react";
import { db } from "@/db";
import { kplClubs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getAdsFor } from "@/lib/ads";
import { listCommunities } from "@/lib/communities";
import { getEntry } from "@/lib/fantasy/data";
import { getNextGameweek } from "@/lib/fantasy/engine";
import { listBusinesses } from "@/lib/market";
import { getPosts } from "@/lib/queries";
import { canScout } from "@/lib/roles";
import { SPORTS, categoryLabel } from "@/lib/constants";
import { compact, countdown, formatDate, formatKickoff } from "@/lib/format";
import { PostCard } from "@/components/feed/post-card";
import { Carousel } from "@/components/sport/carousel";
import { HighlightCard, LeagueTile, NewsSlide } from "@/components/sport/cards";
import { ClubBadge } from "@/components/ui/brand";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState, SectionHeader } from "@/components/ui/nav";
import { Aurora, ChevronLines, SlashStripes } from "@/components/brand/graphics";
import { KineticText } from "@/components/motion/kinetic";
import { CommunityCover } from "@/components/communities/community-art";
import { AdCard, BusinessLogo } from "@/components/market/ad-card";
import { BusinessCover } from "@/components/market/business-card";

export const metadata: Metadata = { title: "Home" };

const SPORT_CHIPS = ["Football", "Athletics", "Basketball", "Rugby", "Boxing"];

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", hour: "numeric", hour12: false }).format(new Date()));
  return h < 5 ? "Up early" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function HomePage({ searchParams }: PageProps<"/feed">) {
  const user = await requireUser();
  const { tab, sport: rawSport } = await searchParams;
  const sport = typeof rawSport === "string" && SPORTS.includes(rawSport) ? rawSport : undefined;
  const following = tab === "following";

  const [posts, top, next, entry, clubs, ads, crews, shops] = await Promise.all([
    getPosts({ viewerId: user.id, mode: following ? "following" : "forYou", sport }),
    getPosts({ viewerId: user.id, mode: "forYou", sport, mediaOnly: true, limit: 4 }),
    getNextGameweek(db),
    getEntry(user.id),
    db.select().from(kplClubs).orderBy(asc(kplClubs.name)),
    getAdsFor(user, 1),
    listCommunities({ viewerId: user.id, category: sport, limit: 8 }),
    listBusinesses({ county: user.county ?? undefined, sport, limit: 6 }).then((r) => (r.length ? r : listBusinesses({ limit: 6 }))),
  ]);
  const topIds = new Set(top.map((p) => p.id));
  const rest = posts.filter((p) => !topIds.has(p.id));
  const highlights = rest.filter((p) => p.statValue || p.mediaUrl).slice(0, 6);
  const crewsToJoin = crews.filter((c) => !c.joined).slice(0, 6);
  const first = user.displayName.split(" ")[0];

  const chips = [
    { href: "/feed", label: "Trending", icon: <Flame size={14} />, active: !following && !sport },
    { href: "/feed?tab=following", label: "Following", active: following && !sport },
    ...SPORT_CHIPS.map((s) => ({ href: `/feed?sport=${s}`, label: s, active: sport === s })),
  ];
  const quick = [
    { href: "/watch", label: "Watch", icon: Clapperboard },
    { href: "/fantasy", label: "Fantasy", icon: Shirt },
    { href: "/communities", label: "Crews", icon: UsersRound },
    { href: "/market", label: "Market", icon: Store },
    ...(canScout(user) ? [{ href: "/scout", label: "Scout", icon: Radar }] : []),
  ];

  return (
    <div className="flex flex-col gap-7 px-4 pt-4">
      {/* Greeting */}
      <section className="relative isolate overflow-hidden rounded-[28px] bg-navy px-5 pb-5 pt-6 text-white">
        <Aurora intensity={0.9} />
        <ChevronLines className="parallax pointer-events-none absolute -right-32 -top-8 h-[150%] w-auto opacity-45" count={6} />
        <div className="relative">
          <p className="animate-fade-slide-up text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
            {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <KineticText as="h1" text={`${greeting()}, *${first}.*`} className="mt-1.5 text-[clamp(28px,8.4vw,36px)] font-bold leading-[1.05] tracking-[-0.035em]" />
          <nav aria-label="Shortcuts" className="mt-5 grid grid-cols-4 gap-2" data-stagger="60">
            {quick.slice(0, 4).map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} data-reveal="up" className="glass pressable group flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[11px] font-semibold">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-green transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-0.5 group-hover:scale-110">
                  <Icon size={18} />
                </span>
                {label}
              </Link>
            ))}
          </nav>
          {quick[4] && (
            <Link href="/scout" className="glass pressable mt-2 flex items-center justify-between rounded-2xl px-4 py-3 text-[13px] font-semibold">
              <span className="flex items-center gap-2">
                <Radar size={16} className="text-green" /> Scout portal
              </span>
              <span className="text-white/55">Find talent →</span>
            </Link>
          )}
        </div>
      </section>

      <form action="/discover" role="search">
        <SearchField placeholder="Athlete, club, sport or county" />
      </form>

      <ChipRow items={chips} label="Filter the feed" />

      {top.length > 0 && (
        <div data-reveal="fade">
          <Carousel label="Top stories">
            {top.map((p, i) => (
              <NewsSlide
                key={p.id}
                href={`/p/${p.id}`}
                image={p.mediaUrl}
                video={p.mediaType === "video"}
                seed={p.id}
                tag={i === 0 ? "Top story" : (p.author.sport ?? "Showcase")}
                title={p.body || `${p.statLabel} ${p.statValue}`}
                stat={p.statValue ? { label: p.statLabel ?? "", value: p.statValue } : null}
                meta={
                  <>
                    <span className="font-semibold text-green">{p.author.displayName}</span> · {formatDate(p.createdAt, { weekday: "short", day: "numeric", month: "short" })}
                  </>
                }
              />
            ))}
          </Carousel>
        </div>
      )}

      {next && (
        <Link href="/fantasy" data-reveal="up" className="pressable edge-glow relative block overflow-hidden rounded-[24px] bg-navy p-4 text-white">
          <SlashStripes className="absolute -bottom-4 -right-12 w-40 opacity-80" />
          <p className="kicker flex items-center gap-1.5 text-white/60">
            <Timer size={13} /> Riadha Fantasy · Gameweek {next.id}
          </p>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.02em]">{entry ? "Set your captain" : "Pick your XI"}</p>
          <p className="mt-1 text-[13px] text-white/70">
            Deadline {formatKickoff(next.deadline)} · <span className="font-semibold text-green">{countdown(next.deadline)}</span> left
          </p>
          <span className="btn btn-accent btn-sm mt-4">{entry ? "Open my team" : "Build my squad"}</span>
        </Link>
      )}

      {highlights.length > 0 && (
        <section>
          <SectionHeader title="Highlights" href="/watch" action="Watch reels" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4" data-stagger="70">
            {highlights.map((p) => (
              <div key={p.id} data-reveal="right" className="shrink-0">
                <HighlightCard
                  href={`/p/${p.id}`}
                  image={p.mediaUrl}
                  video={p.mediaType === "video"}
                  seed={p.id}
                  tag={p.statLabel ?? "Highlight"}
                  title={p.statValue ? `${p.statValue} · ${p.author.displayName}` : p.author.displayName}
                  body={p.body}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {crewsToJoin.length > 0 && (
        <section>
          <SectionHeader title="Crews to join" href="/communities" action="All communities" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4" data-stagger="70">
            {crewsToJoin.map(({ community: c, members }) => (
              <Link key={c.id} href={`/c/${c.slug}`} data-reveal="right" className="pressable card w-[190px] shrink-0 overflow-hidden">
                <CommunityCover name={c.name} category={c.category} coverUrl={c.coverUrl} className="h-24" iconSize={44} />
                <div className="p-3">
                  <p className="line-clamp-1 font-semibold">{c.name}</p>
                  <p className="text-[12px] text-muted">
                    {c.category} · {compact(members)} member{members === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="KPL clubs" href="/fixtures" action="Fixtures" />
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" data-stagger="40">
          {clubs.map((c) => (
            <div key={c.id} data-reveal="scale" className="shrink-0">
              <LeagueTile href={`/fixtures?club=${c.id}`} badge={<ClubBadge short={c.shortName} primary={c.primaryColor} secondary={c.secondaryColor} size={40} />} name={c.name} />
            </div>
          ))}
        </div>
      </section>

      {shops.length > 0 && (
        <section>
          <SectionHeader title={user.county ? `Near you in ${user.county}` : "Marketplace"} href="/market" action="Marketplace" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4" data-stagger="70">
            {shops.map((b) => (
              <Link key={b.id} href={`/market/${b.slug}`} data-reveal="right" className="pressable card group w-[220px] shrink-0 overflow-hidden">
                <BusinessCover b={b} className="h-24" />
                <div className="flex items-center gap-2.5 p-3">
                  <BusinessLogo name={b.name} url={b.logoUrl} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">{b.name}</p>
                    <p className="truncate text-[12px] text-muted">
                      {categoryLabel(b.category)} · {b.county}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title={following ? "From people you follow" : "Latest"} />
        <div className="mt-3 flex flex-col gap-4">
          {rest.length === 0 && top.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body={following ? "Follow athletes and clubs to fill this feed." : "No posts in this sport yet. Be the first."}
              action={<Link href={following ? "/discover" : "/post/new"} className="btn btn-accent">{following ? "Discover athletes" : "Post a highlight"}</Link>}
            />
          ) : (
            rest.map((p, i) => (
              <div key={p.id} className="flex flex-col gap-4">
                <div data-reveal="up">
                  <PostCard post={p} signedIn priority={i < 1} viewer={{ id: user.id, isAdmin: user.isAdmin }} />
                </div>
                {i === 2 && ads[0] && (
                  <div data-reveal="up">
                    <AdCard ad={ads[0]} placement="home" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
