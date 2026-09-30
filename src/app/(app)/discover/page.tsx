import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { searchPeople } from "@/lib/queries";
import { SPORTS } from "@/lib/constants";
import { ageFrom } from "@/lib/format";
import { SearchField } from "@/components/ui/controls";
import { ChipRow, EmptyState, TabBarLinks } from "@/components/ui/nav";
import { Avatar } from "@/components/ui/avatar";
import { Tick } from "@/components/ui/tick";

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
  const people = await searchPeople({ q, sport: sport || undefined, role });

  const href = (patch: Record<string, string>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(sport && { sport }), ...(role && { role }), ...patch });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    return `/discover${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="px-4 pt-5">
      <h1 className="h2">Discover</h1>
      <form className="mt-4" action="/discover" role="search">
        <SearchField defaultValue={q} placeholder="Name, county, position…" autoFocus={!q && !sport && !role} />
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
        {people.length === 0 && <li><EmptyState title="No one matches that yet" body="Try another name, county or sport." /></li>}
      </ul>
    </div>
  );
}
