import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getLeagueTable } from "@/lib/fantasy/data";
import { ClubBadge } from "@/components/ui/brand";

export const metadata: Metadata = { title: "KPL table" };

export default async function TablePage() {
  await requireUser();
  const table = await getLeagueTable();
  return (
    <div className="px-3 pt-4">
      <p className="kicker px-1">Kenyan Premier League</p>
      <h1 className="px-1 h2">Table</h1>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-gray-100 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              <th className="px-3 py-2.5">#</th>
              <th className="px-2 py-2.5">Club</th>
              {["P", "W", "D", "L", "GD", "Pts"].map((h) => (
                <th key={h} className="px-1.5 py-2.5 text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => (
              <tr key={r.clubId} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2"><span className={i < 3 ? "inline-grid h-6 w-6 place-items-center rounded-md bg-green font-bold text-navy" : i >= table.length - 2 ? "inline-grid h-6 w-6 place-items-center rounded-md bg-gray-200 font-semibold" : "pl-1.5"}>{i + 1}</span></td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <ClubBadge short={r.club.shortName} primary={r.club.primaryColor} secondary={r.club.secondaryColor} size={22} />
                    <span className="truncate">{r.club.name}</span>
                  </span>
                </td>
                {[r.p, r.w, r.d, r.l, r.gf - r.ga, r.pts].map((v, j) => (
                  <td key={j} className={`px-1.5 py-2 text-right tabular ${j === 5 ? "font-bold" : ""}`}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 px-1 text-xs text-muted">Fixtures and results are illustrative until a KPL data licence is in place.</p>
    </div>
  );
}
