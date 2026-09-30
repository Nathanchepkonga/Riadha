import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { Flame, Timer } from "lucide-react";
import { db } from "@/db";
import { kplClubs } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getEntry } from "@/lib/fantasy/data";
import { getNextGameweek } from "@/lib/fantasy/engine";
import { getPosts } from "@/lib/queries";
import { SPORTS } from "@/lib/constants";
import { countdown, formatDate, formatKickoff } from "@/lib/format";
import { PostCard } from "@/components/feed/post-card";
import { Carousel } from "@/components/sport/carousel";
import { HighlightCard, LeagueTile, NewsSlide } from "@/components/sport/cards";
import { ClubBadge } from "@/components/ui/brand";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState, SectionHeader } from "@/components/ui/nav";
import { SlashStripes } from "@/components/brand/graphics";

export const metadata: Metadata = { title: "Home" };

const SPORT_CHIPS = ["Football", "Athletics", "Basketball", "Rugby", "Boxing"];

export default async function HomePage({ searchParams }: PageProps<"/feed">) {
  const user = await requireUser();
  const { tab, sport: rawSport } = await searchParams;
  const sport = typeof rawSport === "string" && SPORTS.includes(rawSport) ? rawSport : undefined;
  const following = tab === "following";

  const [posts, top, next, entry, clubs] = await Promise.all([
    getPosts({ viewerId: user.id, mode: following ? "following" : "forYou", sport }),
    getPosts({ viewerId: user.id, mode: "forYou", sport, mediaOnly: true, limit: 4 }),
    getNextGameweek(db),
    getEntry(user.id),
    db.select().from(kplClubs).orderBy(asc(kplClubs.name)),
  ]);
  const topIds = new Set(top.map((p) => p.id));
  const rest = posts.filter((p) => !topIds.has(p.id));
  const highlights = rest.filter((p) => p.statValue || p.mediaUrl).slice(0, 6);

  const chips = [
    { href: "/feed", label: "Trending", icon: <Flame size={14} />, active: !following && !sport },
    { href: "/feed?tab=following", label: "Following", active: following && !sport },
    ...SPORT_CHIPS.map((s) => ({ href: `/feed?sport=${s}`, label: s, active: sport === s })),
  ];

  return (
    <div className="flex flex-col gap-7 px-4 pt-4">
      <form action="/discover" role="search">
        <SearchField placeholder="Athlete, club, sport or county" />
      </form>

      <ChipRow items={chips} label="Filter the feed" />

      {top.length > 0 && (
        <Carousel label="Top stories">
          {top.map((p, i) => (
            <NewsSlide
              key={p.id}
              href={`/p/${p.id}`}
              image={p.mediaUrl}
              video={p.mediaType === "video"}
              seed={p.id}
              tag={i === 0 ? "Top story" : p.author.sport ?? "Showcase"}
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
      )}

      {next && (
        <Link href="/fantasy" className="relative block overflow-hidden rounded-2xl bg-navy p-4 text-white">
          <SlashStripes className="absolute -bottom-6 -right-4 w-32 rotate-90 opacity-90" />
          <p className="kicker flex items-center gap-1.5 text-white/60"><Timer size={13} /> Riadha Fantasy · Gameweek {next.id}</p>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.02em]">{entry ? "Set your captain" : "Pick your XI"}</p>
          <p className="mt-1 text-[13px] text-white/70">Deadline {formatKickoff(next.deadline)} · {countdown(next.deadline)} left</p>
          <span className="btn btn-accent btn-sm mt-4">{entry ? "Open my team" : "Build my squad"}</span>
        </Link>
      )}

      {highlights.length > 0 && (
        <section>
          <SectionHeader title="Highlights" href="/discover" action="Discover" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4">
            {highlights.map((p) => (
              <HighlightCard
                key={p.id}
                href={`/p/${p.id}`}
                image={p.mediaUrl}
                video={p.mediaType === "video"}
                seed={p.id}
                tag={p.statLabel ?? "Highlight"}
                title={p.statValue ? `${p.statValue} · ${p.author.displayName}` : p.author.displayName}
                body={p.body}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="KPL clubs" href="/fixtures" action="Fixtures" />
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {clubs.map((c) => (
            <LeagueTile
              key={c.id}
              href={`/fixtures?club=${c.id}`}
              badge={<ClubBadge short={c.shortName} primary={c.primaryColor} secondary={c.secondaryColor} size={40} />}
              name={c.name}
            />
          ))}
        </div>
      </section>

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
            rest.map((p, i) => <PostCard key={p.id} post={p} signedIn priority={i < 1} />)
          )}
        </div>
      </section>
    </div>
  );
}
