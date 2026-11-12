import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { searchDiscover, searchPeople } from "@/lib/queries";
import { SPORTS } from "@/lib/constants";
import { ageFrom } from "@/lib/format";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState, TabBarLinks } from "@/components/ui/nav";
import { Avatar } from "@/components/ui/avatar";
import { Tick } from "@/components/ui/tick";
import { RecentSearches } from "@/components/discover/recent-searches";
import { formatDate, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Discover" };

const ROLE_TABS = [
  { value: "", label: "All" },
  { value: "athlete", label: "Athletes" },
  { value: "club", label: "Clubs" },
  { value: "scout", label: "Scouts" },
] as const;

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  await requireUser();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sport = typeof sp.sport === "string" && SPORTS.includes(sp.sport) ? sp.sport : "";
  const role = ROLE_TABS.some((t) => t.value === sp.role) ? (sp.role as "athlete" | "club" | "scout") : undefined;
  const [people, results] = await Promise.all([
    searchPeople({ q, sport: sport || undefined, role }),
    searchDiscover(q),
  ]);

  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(sport && { sport }), ...(role && { role }), ...patch });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    return `/discover${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="px-4 pt-5">
      <h1 className="h2">Discover</h1>
      <form className="mt-4" action="/discover" role="search">
        <label htmlFor="discover-query" className="sr-only">Search athletes, clubs, communities and more</label>
        <SearchField id="discover-query" name="q" defaultValue={q} placeholder="Name, county, position…" className="[&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-cobalt" />
        {sport && <input type="hidden" name="sport" value={sport} />}
        {role && <input type="hidden" name="role" value={role} />}
      </form>

      <TabBarLinks
        className="mt-4"
        label="Who"
        items={ROLE_TABS.map((t) => ({ href: href({ role: t.value }), label: t.label, active: (role ?? "") === t.value }))}
      />
      <ChipRow
        className="mt-4"
        label="Sport"
        items={["", ...SPORTS].map((s) => ({ href: href({ sport: s }), label: s || "All sports", active: sport === s }))}
      />
      <RecentSearches query={q} />

      {q && (
        <div className="mt-6 flex flex-col gap-6">
          <ResultSection title="Communities" count={results.communities.length}>
            {results.communities.map((c) => (
              <li key={c.id}><Link href={`/c/${c.slug}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cobalt text-white text-lg font-bold">{c.name.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.name}</span><span className="block truncate text-xs text-muted">{[c.category, c.county].filter(Boolean).join(" · ") || c.description}</span></span>
              </Link></li>
            ))}
          </ResultSection>
          <ResultSection title="Marketplace" count={results.businesses.length}>
            {results.businesses.map((b) => (
              <li key={b.id}><Link href={`/market/${b.slug}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                {b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- marketplace logo URL
                  <img src={b.logoUrl} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                ) : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-green text-lg font-bold">{b.name.slice(0, 1).toUpperCase()}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{b.name}</span><span className="block truncate text-xs text-muted">{b.category} · {b.county}</span></span>
                {b.verified && <span className="text-xs font-semibold text-cobalt">Verified</span>}
              </Link></li>
            ))}
          </ResultSection>
          <ResultSection title="Challenges" count={results.challenges.length}>
            {results.challenges.map((c) => (
              <li key={c.id}><Link href={`/challenges/${c.slug}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-green text-navy font-bold">★</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.title}</span><span className="block truncate text-xs text-muted">{c.tagline || `${c.kind === "total" ? "Distance" : "Single effort"} challenge`}</span></span>
              </Link></li>
            ))}
          </ResultSection>
          <ResultSection title="Posts" count={results.posts.length}>
            {results.posts.map((p) => (
              <li key={p.id}><Link href={`/p/${p.id}`} className="card block p-3 transition-colors hover:border-gray-400">
                <span className="block text-xs text-muted">@{p.author.handle} · {p.kind}</span>
                <span className="mt-1 block line-clamp-2 text-sm">{p.body || "Shared a Riadha update."}</span>
              </Link></li>
            ))}
          </ResultSection>
          <ResultSection title="Fixtures" count={results.fixtures.length}>
            {results.fixtures.map((f) => (
              <li key={f.id}><Link href={`/fixtures/${f.id}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-green text-xs font-bold">GW{f.gameweekId}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{f.home.shortName} <span className="text-muted">vs</span> {f.away.shortName}</span><span className="block text-xs text-muted">{formatDate(f.kickoff, { weekday: "short", day: "numeric", month: "short" })} · {formatTime(f.kickoff)}</span></span>
              </Link></li>
            ))}
          </ResultSection>
          <ResultSection title="Community events" count={results.events.length}>
            {results.events.map((e) => (
              <li key={e.id}><Link href={`/c/${e.slug}/events/${e.id}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cobalt text-white text-xs font-bold">{formatDate(e.startsAt, { day: "numeric", month: "short" })}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{e.title}</span><span className="block truncate text-xs text-muted">{e.communityName} · {e.location}</span></span>
              </Link></li>
            ))}
          </ResultSection>
        </div>
      )}

      <h2 className="kicker mt-6">{q ? "People" : "Athletes and clubs"}</h2>
      <ul className="mt-5 flex flex-col gap-2">
        {people.map((p) => {
          const age = ageFrom(p.dateOfBirth);
          return (
            <li key={p.id}>
              <Link href={`/u/${p.handle}`} className="card flex items-center gap-3 p-3 transition-colors hover:border-gray-400">
                <Avatar name={p.displayName} url={p.avatarUrl} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{p.displayName}</span>
                    <Tick role={p.role} verified={p.verified} size={15} />
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {[p.sport, p.position, p.county, p.role === "athlete" && age !== null ? `${age}` : null].filter(Boolean).join(" · ") || `@${p.handle}`}
                  </span>
                </span>
                {p.topStat ? (
                  <span className="shrink-0 text-right">
                    <span className="kicker block text-[10px]">{p.topStat.label}</span>
                    <span className="mt-0.5 block text-xl font-bold leading-none tracking-[-0.04em]">{p.topStat.value}</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted">{p.followers} followers</span>
                )}
              </Link>
            </li>
          );
        })}
        {people.length === 0 && <li><EmptyState title={q ? "No people match that yet" : "No people to show yet"} body={q ? "We checked athletes, clubs and scouts. Try another name, county or sport." : "Try searching for an athlete, club or sport."} /></li>}
      </ul>
    </div>
  );
}

function ResultSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (!count) return null;
  return <section><div className="flex items-center justify-between"><h2 className="h5">{title}</h2><span className="text-xs text-muted">{count}</span></div><ul className="mt-2 flex flex-col gap-2">{children}</ul></section>;
}
