"use client";

import { useState, useTransition } from "react";
import { saveFixture } from "@/actions/admin";
import type { StatInput } from "@/lib/fantasy/engine";
import { cn } from "@/lib/format";

type Row = { id: number; name: string; position: string; points: number | null; bonus: number; stat: StatInput };
const COLS: { key: keyof StatInput; label: string; max: number }[] = [
  { key: "minutes", label: "Min", max: 130 },
  { key: "goals", label: "G", max: 10 },
  { key: "assists", label: "A", max: 10 },
  { key: "saves", label: "Sv", max: 30 },
  { key: "penSaved", label: "PS", max: 5 },
  { key: "penMissed", label: "PM", max: 5 },
  { key: "yellow", label: "YC", max: 1 },
  { key: "red", label: "RC", max: 1 },
  { key: "ownGoals", label: "OG", max: 5 },
];

export function StatSheet({
  fixtureId,
  homeName,
  awayName,
  initial,
  home,
  away,
}: {
  fixtureId: number;
  homeName: string;
  awayName: string;
  initial: { homeScore: number; awayScore: number; finished: boolean };
  home: Row[];
  away: Row[];
}) {
  const [score, setScore] = useState(initial);
  const [rows, setRows] = useState(() => new Map([...home, ...away].map((r) => [r.id, r.stat])));
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();

  const set = (id: number, key: keyof StatInput, v: number) =>
    setRows((m) => new Map(m).set(id, { ...m.get(id)!, [key]: Math.max(0, Number.isFinite(v) ? v : 0) }));

  const goalsFor = (list: Row[]) => list.reduce((s, r) => s + rows.get(r.id)!.goals, 0);
  const ownGoalsBy = (list: Row[]) => list.reduce((s, r) => s + rows.get(r.id)!.ownGoals, 0);
  const expectedHome = goalsFor(home) + ownGoalsBy(away);
  const expectedAway = goalsFor(away) + ownGoalsBy(home);
  const mismatch = expectedHome !== score.homeScore || expectedAway !== score.awayScore;

  function table(title: string, list: Row[]) {
    return (
      <div className="card mt-4 overflow-x-auto">
        <p className="border-b border-line px-3 py-2 font-semibold">{title}</p>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
              <th className="px-3 py-2">Player</th>
              {COLS.map((c) => <th key={c.key} className="px-1 py-2 text-center">{c.label}</th>)}
              <th className="px-2 py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const s = rows.get(r.id)!;
              return (
                <tr key={r.id} className={cn("border-t border-line/60", s.minutes === 0 && "opacity-60")}>
                  <td className="whitespace-nowrap px-3 py-1.5">
                    <span className="mr-1.5 text-[10px] text-muted">{r.position}</span>
                    {r.name}
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-0.5 py-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={c.max}
                        value={s[c.key]}
                        onChange={(e) => set(r.id, c.key, e.target.valueAsNumber)}
                        onFocus={(e) => e.target.select()}
                        aria-label={`${r.name} ${c.label}`}
                        className={cn("h-8 w-full min-w-10 rounded-md border border-line bg-gray-100 text-center text-base outline-none focus:border-cobalt md:text-sm", c.key === "minutes" && "min-w-12")}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right text-muted">{r.points ?? "–"}{r.bonus ? <sup className="font-semibold text-cobalt">+{r.bonus}</sup> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <div className="card mt-4 flex flex-wrap items-center gap-3 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          {homeName}
          <input type="number" min={0} value={score.homeScore} onChange={(e) => setScore((s) => ({ ...s, homeScore: Math.max(0, e.target.valueAsNumber || 0) }))} className="field h-10 w-16 text-center" aria-label="Home score" />
        </label>
        <span className="text-muted">–</span>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="number" min={0} value={score.awayScore} onChange={(e) => setScore((s) => ({ ...s, awayScore: Math.max(0, e.target.valueAsNumber || 0) }))} className="field h-10 w-16 text-center" aria-label="Away score" />
          {awayName}
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={score.finished} onChange={(e) => setScore((s) => ({ ...s, finished: e.target.checked }))} className="h-4 w-4 accent-[#081018]" />
          Full time
        </label>
      </div>
      {mismatch && (
        <p className="mt-2 rounded-lg border-l-4 border-warning bg-warning/15 px-3 py-2 text-sm">
          Player goals add up to {expectedHome}–{expectedAway}, but the score says {score.homeScore}–{score.awayScore}.
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Clean sheets and goals conceded come from the score. Bonus (3/2/1) goes to the best three performers automatically.</p>

      {table(homeName, home)}
      {table(awayName, away)}

      {msg && <p role={msg.error ? "alert" : "status"} className={cn("mt-4 rounded-xl px-4 py-3 text-sm", msg.error ? "border-l-4 border-danger bg-danger/8 text-ink" : "border-l-4 border-green bg-green/20 text-ink")}>{msg.error ?? msg.ok}</p>}
      <div className="sticky bottom-[calc(1rem+var(--sab))] mt-4">
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary btn-lg btn-block shadow-2xl"
          onClick={() => start(async () => setMsg(await saveFixture(fixtureId, { ...score, rows: [...rows.values()] })))}
        >
          {pending ? "Saving & rescoring…" : "Save result & rescore"}
        </button>
      </div>
    </div>
  );
}
