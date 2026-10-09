import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, UsersRound } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listCommunities, myCommunities, upcomingForUser } from "@/lib/communities";
import { COMMUNITY_INTERESTS } from "@/lib/constants";
import { compact, formatKickoff } from "@/lib/format";
import { PageHero } from "@/components/ui/page-hero";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState, SectionHeader } from "@/components/ui/nav";
import { CommunityCover } from "@/components/communities/community-art";
import { JoinButton } from "@/components/communities/join-button";

export const metadata: Metadata = { title: "Communities" };

export default async function CommunitiesPage({ searchParams }: PageProps<"/communities">) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const category = typeof sp.category === "string" && COMMUNITY_INTERESTS.includes(sp.category) ? sp.category : undefined;

  const [all, mine, upcoming] = await Promise.all([listCommunities({ q: q || undefined, category, viewerId: user.id }), myCommunities(user.id), upcomingForUser(user.id, 6)]);
  const filtering = !!(q || category);

  return (
    <div className="flex flex-col gap-7 px-4 pt-4">
      <PageHero kicker="Communities" title="Find your *crew.*" body="Running crews, teams, tournaments and clubs. Chat, plan events and RSVP in one place.">
        <Link href="/communities/new" className="btn btn-accent">
          <Plus size={16} strokeWidth={3} /> Start a community
        </Link>
      </PageHero>

      {!filtering && upcoming.length > 0 && (
        <section>
          <SectionHeader title="Coming up for you" />
          <div className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4" data-stagger="80">
            {upcoming.map((u) => (
              <Link
                key={u.event.id}
                href={`/c/${u.community.slug}/events/${u.event.id}`}
                data-reveal="right"
                className="pressable edge-glow relative w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-navy p-4 text-white"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green">{formatKickoff(u.event.startsAt)}</p>
                <p className="mt-2 line-clamp-2 text-[17px] font-bold leading-tight tracking-[-0.02em]">{u.event.title}</p>
                <p className="mt-2 truncate text-[12px] text-white/60">{u.community.name}</p>
                <p className="mt-3 flex items-center gap-3 text-[12px] text-white/75">
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> <span className="max-w-[110px] truncate">{u.event.location}</span></span>
                  <span className="inline-flex items-center gap-1"><UsersRound size={12} /> {u.going}</span>
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!filtering && mine.length > 0 && (
        <section>
          <SectionHeader title="Your communities" />
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4" data-stagger="60">
            {mine.map((m) => (
              <Link key={m.community.id} href={`/c/${m.community.slug}?tab=chat`} data-reveal="right" className="pressable w-[132px] shrink-0">
                <CommunityCover name={m.community.name} category={m.community.category} coverUrl={m.community.coverUrl} className="aspect-square rounded-2xl" iconSize={40} />
                <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-tight">{m.community.name}</p>
                <p className="text-[11px] capitalize text-muted">{m.role} · {compact(m.members)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <SectionHeader title={filtering ? "Results" : "Discover"} />
        <form action="/communities" role="search">
          {category && <input type="hidden" name="category" value={category} />}
          <SearchField defaultValue={q} placeholder="Search by name, sport or county" />
        </form>
        <ChipRow
          label="Filter by interest"
          items={[{ href: "/communities", label: "All", active: !category }, ...COMMUNITY_INTERESTS.filter((c) => c !== "Other").map((c) => ({ href: `/communities?category=${c}`, label: c, active: category === c }))]}
        />
        <div className="mt-1 flex flex-col gap-3" data-stagger="60">
          {all.length === 0 ? (
            <EmptyState title="No communities here yet" body="Start one and invite your crew." action={<Link href="/communities/new" className="btn btn-accent">Start a community</Link>} />
          ) : (
            all.map(({ community: c, members, joined, nextEvent }) => (
              <article key={c.id} data-reveal="up" className="card pressable relative flex gap-3 overflow-hidden p-3">
                <Link href={`/c/${c.slug}`} className="absolute inset-0 z-0" aria-label={c.name} />
                <CommunityCover name={c.name} category={c.category} coverUrl={c.coverUrl} className="pointer-events-none h-[84px] w-[84px] shrink-0 rounded-xl" iconSize={34} />
                <div className="pointer-events-none min-w-0 flex-1 py-0.5">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-[12px] text-muted">
                    {c.category}
                    {c.county ? ` · ${c.county}` : ""} · {compact(members)} member{members === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 line-clamp-1 text-[13px] text-muted">{c.description}</p>
                  {nextEvent && (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold">
                      <CalendarDays size={11} /> {formatKickoff(new Date(nextEvent))}
                    </p>
                  )}
                </div>
                <div className="relative z-10 self-center">
                  {joined ? <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-muted">Joined</span> : <JoinButton communityId={c.id} joined={false} />}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
