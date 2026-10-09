import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ListChecks, Radar, SlidersHorizontal } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { canScout } from "@/lib/roles";
import { popularSkills, searchTalent, shortlistCounts, talentByCounty, type TalentFilters } from "@/lib/scout";
import { COUNTIES, SPORTS } from "@/lib/constants";
import { cn } from "@/lib/format";
import { PageHero } from "@/components/ui/page-hero";
import { SearchField } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/nav";
import { TalentCard } from "@/components/scout/talent-card";

export const metadata: Metadata = { title: "Scout portal" };

const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "youngest", label: "Youngest first" },
  { value: "followers", label: "Most followed" },
  { value: "newest", label: "Newest on Riadha" },
] as const;

const STAGES = [
  { value: "watching", label: "Watching" },
  { value: "contacted", label: "Contacted" },
  { value: "trial", label: "Trial" },
  { value: "signed", label: "Signed" },
] as const;

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : undefined;
}
function num(v: string | string[] | undefined, min: number, max: number) {
  const n = Number(str(v));
  return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
}

export default async function ScoutPage({ searchParams }: PageProps<"/scout">) {
  const user = await requireUser();
  if (!canScout(user)) return <ScoutGate />;

  const sp = await searchParams;
  const skillsParam = sp.skills;
  const filters: TalentFilters = {
    q: str(sp.q) || undefined,
    sport: SPORTS.includes(str(sp.sport) ?? "") ? str(sp.sport) : undefined,
    county: COUNTIES.includes(str(sp.county) ?? "") ? str(sp.county) : undefined,
    position: str(sp.position) || undefined,
    minAge: num(sp.minAge, 8, 60),
    maxAge: num(sp.maxAge, 8, 60),
    skills: (Array.isArray(skillsParam) ? skillsParam : skillsParam ? [skillsParam] : []).filter((s) => s.length <= 24).slice(0, 8),
    verifiedOnly: sp.verified === "1",
    openOnly: sp.open === "1",
    relocateOnly: sp.relocate === "1",
    videoOnly: sp.video === "1",
    sort: SORTS.some((s) => s.value === sp.sort) ? (sp.sort as TalentFilters["sort"]) : "relevance",
  };
  const filtered = !!(filters.q || filters.sport || filters.county || filters.position || filters.minAge || filters.maxAge || filters.skills?.length || filters.verifiedOnly || filters.openOnly || filters.relocateOnly || filters.videoOnly);
  const activeCount = [filters.sport, filters.county, filters.position, filters.minAge, filters.maxAge, filters.verifiedOnly, filters.openOnly, filters.relocateOnly, filters.videoOnly].filter(Boolean).length + (filters.skills?.length ?? 0);

  const [talent, skills, counts, counties] = await Promise.all([searchTalent(filters, user.id), popularSkills(filters.sport), shortlistCounts(user.id), talentByCounty(8)]);
  const shortlisted = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <PageHero kicker={<span className="inline-flex items-center gap-1.5"><Radar size={13} /> Scout portal</span>} title="Find talent in all *47 counties.*" body="Search every athlete on Riadha by sport, age, position and skill. Contact with under-18s always goes through their guardian and club.">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Link href="/scout/shortlist" className="glass pressable inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold">
            <ListChecks size={15} className="text-green" /> Shortlist <span className="tabular text-white/60">{shortlisted}</span>
          </Link>
          {STAGES.map((s) => (
            <Link key={s.value} href={`/scout/shortlist?stage=${s.value}`} className="glass pressable inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px]">
              {s.label} <span className="tabular font-semibold">{counts[s.value] ?? 0}</span>
            </Link>
          ))}
        </div>
      </PageHero>

      {!user.verified && !user.isAdmin && (
        <p className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-3.5 text-[13px] text-muted">
          <BadgeCheck size={18} className="mt-0.5 shrink-0 text-cobalt" />
          <span>
            Athletes and clubs trust verified scouts first. <Link href="/me/verify" className="font-semibold text-cobalt">Get your grey tick</Link>.
          </span>
        </p>
      )}

      <form action="/scout" role="search" className="flex flex-col gap-3">
        <SearchField defaultValue={filters.q ?? ""} placeholder="Name, position or keyword" />
        <details className="card group overflow-hidden" open={activeCount > 0 && !filters.q}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[14px] font-semibold [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal size={16} /> Filters
              {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-navy px-1.5 text-[11px] text-white">{activeCount}</span>}
            </span>
            <span className="text-[12px] font-normal text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
            <label className="col-span-1">
              <span className="label">Sport</span>
              <select name="sport" defaultValue={filters.sport ?? ""} className="field">
                <option value="">Any sport</option>
                {SPORTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="col-span-1">
              <span className="label">County</span>
              <select name="county" defaultValue={filters.county ?? ""} className="field">
                <option value="">All 47</option>
                {COUNTIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="col-span-2">
              <span className="label">Position or event</span>
              <input name="position" defaultValue={filters.position ?? ""} placeholder="Winger, 800m, point guard…" className="field" maxLength={40} />
            </label>
            <label>
              <span className="label">Age from</span>
              <input name="minAge" type="number" inputMode="numeric" min={8} max={60} defaultValue={filters.minAge ?? ""} placeholder="14" className="field" />
            </label>
            <label>
              <span className="label">Age to</span>
              <input name="maxAge" type="number" inputMode="numeric" min={8} max={60} defaultValue={filters.maxAge ?? ""} placeholder="23" className="field" />
            </label>
            {skills.length > 0 && (
              <fieldset className="col-span-2">
                <legend className="label">Skills</legend>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <label key={s} className="cursor-pointer">
                      <input type="checkbox" name="skills" value={s} defaultChecked={filters.skills?.includes(s)} className="peer sr-only" />
                      <span className="inline-block rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-cobalt">{s}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset className="col-span-2 grid grid-cols-2 gap-2">
              <legend className="label">Show only</legend>
              {[
                ["open", "Open to opportunities", filters.openOnly],
                ["relocate", "Willing to relocate", filters.relocateOnly],
                ["verified", "Verified athletes", filters.verifiedOnly],
                ["video", "Has video", filters.videoOnly],
              ].map(([name, label, on]) => (
                <label key={name as string} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-[13px] font-medium has-checked:border-navy has-checked:bg-gray-100">
                  <input type="checkbox" name={name as string} value="1" defaultChecked={!!on} className="h-4 w-4 accent-[#081018]" />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="col-span-2">
              <span className="label">Sort by</span>
              <select name="sort" defaultValue={filters.sort} className="field">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            <div className="col-span-2 flex gap-2 pt-1">
              <button type="submit" className="btn btn-primary flex-1">Show talent</button>
              {filtered && <Link href="/scout" className="btn btn-ghost">Reset</Link>}
            </div>
          </div>
        </details>
      </form>

      {!filtered && counties.length > 0 && (
        <section>
          <p className="kicker">Talent across Kenya</p>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4" data-stagger="50">
            {counties.map((c) => (
              <Link key={c.county} data-reveal="right" href={`/scout?county=${encodeURIComponent(c.county!)}`} className="pressable inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[13px] font-semibold hover:border-gray-400">
                {c.county} <span className="rounded-full bg-gray-100 px-1.5 text-[11px] tabular text-muted">{c.n}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-live="polite">
        <p className="text-[13px] text-muted">
          <span className="font-semibold text-ink">{talent.length}</span> athlete{talent.length === 1 ? "" : "s"}
          {filtered ? " match" : " on Riadha"}
          {talent.length === 40 && " (top 40)"}
        </p>
        <div className={cn("mt-3 flex flex-col gap-3")} data-stagger="60">
          {talent.length === 0 ? (
            <EmptyState title="No one matches yet" body="Widen the age range, drop a skill or try another county." action={<Link href="/scout" className="btn btn-secondary">Clear filters</Link>} />
          ) : (
            talent.map((t) => <TalentCard key={t.id} t={t} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ScoutGate() {
  return (
    <div className="px-4 pt-4">
      <PageHero kicker="Scout portal" title="For scouts and *clubs.*" body="The Scout Portal lets verified scouts, coaches and clubs search talent in every county and keep a shortlist.">
        <Link href="/me/verify" className="btn btn-accent">Apply as a scout or club</Link>
      </PageHero>
      <p className="mt-5 px-1 text-[14px] text-muted">
        Are you an athlete? Make sure scouts can find you: add your skills and switch on <span className="font-semibold text-ink">Open to opportunities</span> in{" "}
        <Link href="/me/edit#scouting" className="font-semibold text-cobalt">your profile</Link>.
      </p>
    </div>
  );
}
