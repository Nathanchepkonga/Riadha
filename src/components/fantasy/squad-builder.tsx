"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Shuffle } from "lucide-react";
import { createEntry, makeTransfers } from "@/actions/fantasy";
import { Shirt } from "@/components/ui/brand";
import { CloseButton, Sheet } from "@/components/ui/overlay";
import type { PoolPlayer } from "@/lib/fantasy/data";
import { BUDGET, HIT_COST, MAX_PER_CLUB, POSITION_LABEL, SQUAD_SHAPE, formatPrice, type Pos } from "@/lib/fantasy/rules";
import { cn } from "@/lib/format";
import { EmptyChip, FDR_BG, Pitch, PitchRow, PlayerChip } from "./pitch";

type Slot = { pos: Pos; id: number | null };
const ORDER: Pos[] = ["GK", "DEF", "MID", "FWD"];

function slotsFrom(ids: number[], byId: Map<number, PoolPlayer>): Slot[] {
  return ORDER.flatMap((pos) => {
    const mine = ids.filter((id) => byId.get(id)?.position === pos);
    return Array.from({ length: SQUAD_SHAPE[pos] }, (_, i) => ({ pos, id: mine[i] ?? null }));
  });
}

export function SquadBuilder({
  mode,
  pool,
  initialIds = [],
  prevIds = null,
  freeTransfers = Infinity,
  defaultTeamName = "",
  joinCode,
}: {
  mode: "create" | "transfers";
  pool: PoolPlayer[];
  initialIds?: number[];
  /** Squad at the previous deadline; null while transfers are unlimited. */
  prevIds?: number[] | null;
  freeTransfers?: number;
  defaultTeamName?: string;
  /** League invite code to join once the squad is saved. */
  joinCode?: string;
}) {
  const byId = useMemo(() => new Map(pool.map((p) => [p.id, p])), [pool]);
  const [slots, setSlots] = useState<Slot[]>(() => slotsFrom(initialIds, byId));
  const [picking, setPicking] = useState<number | null>(null); // slot index being filled
  const [inspect, setInspect] = useState<number | null>(null); // slot index tapped
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const chosen = slots.flatMap((s) => (s.id ? [byId.get(s.id)!] : []));
  const spent = chosen.reduce((sum, p) => sum + p.price, 0);
  const bank = BUDGET - spent;
  const perClub = new Map<number, number>();
  for (const p of chosen) perClub.set(p.clubId, (perClub.get(p.clubId) ?? 0) + 1);
  const full = chosen.length === 15;

  const original = new Set(initialIds);
  const transfersNow = mode === "transfers" ? chosen.filter((p) => !original.has(p.id)).length : 0;
  const madeVsDeadline = prevIds ? chosen.filter((p) => !prevIds.includes(p.id)).length : 0;
  const hitCost = prevIds ? Math.max(0, madeVsDeadline - freeTransfers) * HIT_COST : 0;

  function fill(index: number, id: number) {
    setSlots((s) => s.map((slot, i) => (i === index ? { ...slot, id } : slot)));
    setPicking(null);
    setError(null);
  }

  function autoPick() {
    for (let attempt = 0; attempt < 80; attempt++) {
      const next = slots.map((s) => ({ ...s }));
      const clubs = new Map(perClub);
      const taken = new Set(chosen.map((p) => p.id));
      let money = bank;
      const empties = next.map((s, i) => (s.id ? -1 : i)).filter((i) => i >= 0).sort(() => Math.random() - 0.5);
      let ok = true;
      for (let k = 0; k < empties.length; k++) {
        const slot = next[empties[k]];
        const reserve = (empties.length - k - 1) * 42;
        const options = pool.filter(
          (p) => p.position === slot.pos && !taken.has(p.id) && (clubs.get(p.clubId) ?? 0) < MAX_PER_CLUB && p.price <= money - reserve,
        );
        if (!options.length) {
          ok = false;
          break;
        }
        // Lean towards in-form players without always taking the same ones.
        const p = options.sort((a, b) => b.totalPoints - a.totalPoints)[Math.floor(Math.random() * Math.min(options.length, 12))];
        slot.id = p.id;
        taken.add(p.id);
        clubs.set(p.clubId, (clubs.get(p.clubId) ?? 0) + 1);
        money -= p.price;
      }
      if (ok) {
        setSlots(next);
        setError(null);
        return;
      }
    }
    setError("Couldn't auto-pick within budget. Remove a pricey player and try again.");
  }

  function submit() {
    setError(null);
    const ids = slots.map((s) => s.id!).filter(Boolean);
    start(async () => {
      const res = mode === "create" ? await createEntry(teamName, ids, joinCode) : await makeTransfers(ids);
      if (res?.error) setError(res.error);
    });
  }

  const inspected = inspect !== null && slots[inspect].id ? byId.get(slots[inspect].id!)! : null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Players" value={`${chosen.length}/15`} />
        <Stat label="Bank" value={formatPrice(bank).replace("KSh ", "")} tone={bank < 0 ? "bad" : "good"} />
        {mode === "transfers" ? (
          <Stat label={prevIds ? `Free: ${freeTransfers}` : "Transfers"} value={prevIds ? (hitCost ? `−${hitCost} pts` : `${madeVsDeadline} made`) : "Unlimited"} tone={hitCost ? "bad" : undefined} />
        ) : (
          <Stat label="Budget" value="100.0m" />
        )}
      </div>

      <Pitch className="mt-3 min-h-[420px]">
        {ORDER.map((pos) => (
          <PitchRow key={pos}>
            {slots.map((slot, i) => {
              if (slot.pos !== pos) return null;
              if (!slot.id) return <EmptyChip key={i} label={pos} onClick={() => setPicking(i)} state={picking === i ? "selected" : "normal"} />;
              const p = byId.get(slot.id)!;
              return (
                <PlayerChip
                  key={i}
                  name={p.name}
                  primary={p.primary}
                  secondary={p.secondary}
                  sub={formatPrice(p.price).replace("KSh ", "")}
                  subTone={mode === "transfers" && !original.has(p.id) ? "fdr2" : "accent"}
                  onClick={() => setInspect(i)}
                />
              );
            })}
          </PitchRow>
        ))}
      </Pitch>

      <div className="mt-3 flex gap-2">
        {chosen.length < 15 && (
          <button type="button" className="btn btn-secondary flex-1" onClick={autoPick}>
            <Shuffle size={16} /> Auto-pick {15 - chosen.length}
          </button>
        )}
        {mode === "transfers" && transfersNow > 0 && (
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setSlots(slotsFrom(initialIds, byId))}>
            Undo changes
          </button>
        )}
      </div>

      {mode === "create" && (
        <div className="mt-5">
          <label className="label" htmlFor="teamName">Team name</label>
          <input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={30} className="field" placeholder="Mashemeji FC" />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg border-l-4 border-danger bg-danger/8 px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="sticky-above-tabbar z-20 mt-4 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur">
        <button
          type="button"
          className="btn btn-primary h-12 w-full text-base"
          disabled={pending || !full || bank < 0 || (mode === "create" ? teamName.trim().length < 3 : transfersNow === 0)}
          onClick={submit}
        >
          {pending
            ? "Saving…"
            : mode === "create"
              ? full
                ? "Save my squad"
                : `Pick ${15 - chosen.length} more`
              : transfersNow === 0
                ? "Make a transfer"
                : `Confirm ${transfersNow} transfer${transfersNow > 1 ? "s" : ""}${hitCost ? ` (−${hitCost} pts)` : ""}`}
        </button>
      </div>

      {inspected && inspect !== null && (
        <Sheet onClose={() => setInspect(null)} title={inspected.name}>
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
            {POSITION_LABEL[inspected.position]} · {inspected.clubName} · {formatPrice(inspected.price)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {inspected.totalPoints} pts this season · {inspected.lastPoints} last gameweek
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSlots((s) => s.map((slot, i) => (i === inspect ? { ...slot, id: null } : slot)));
                setInspect(null);
              }}
            >
              Remove
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSlots((s) => s.map((slot, i) => (i === inspect ? { ...slot, id: null } : slot)));
                setPicking(inspect);
                setInspect(null);
              }}
            >
              Replace
            </button>
          </div>
        </Sheet>
      )}

      {picking !== null && (
        <PlayerPicker
          pos={slots[picking].pos}
          pool={pool}
          taken={new Set(chosen.map((p) => p.id))}
          perClub={perClub}
          bank={bank}
          onPick={(id) => fill(picking, id)}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular tracking-tight", tone === "bad" && "text-danger", tone === "good" && "text-ink")}>{value}</p>
    </div>
  );
}

function PlayerPicker({
  pos,
  pool,
  taken,
  perClub,
  bank,
  onPick,
  onClose,
}: {
  pos: Pos;
  pool: PoolPlayer[];
  taken: Set<number>;
  perClub: Map<number, number>;
  bank: number;
  onPick: (id: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [club, setClub] = useState("");
  const [sort, setSort] = useState<"points" | "price" | "cheap">("points");
  const [affordable, setAffordable] = useState(false);

  const clubs = useMemo(() => [...new Map(pool.map((p) => [p.club, p.clubName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [pool]);
  const list = pool
    .filter((p) => p.position === pos)
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .filter((p) => !club || p.club === club)
    .filter((p) => !affordable || p.price <= bank)
    .sort((a, b) => (sort === "points" ? b.totalPoints - a.totalPoints : sort === "price" ? b.price - a.price : a.price - b.price));

  return (
    <Sheet title={`Pick a ${POSITION_LABEL[pos].toLowerCase()}`} onClose={onClose} tall>
      <div className="border-b border-line p-4">
        <div className="flex items-center justify-between">
          <p className="text-xl font-semibold tracking-tight">Pick a {POSITION_LABEL[pos].toLowerCase()}</p>
          <CloseButton onClick={onClose} />
        </div>
        <p className="mt-1 text-sm text-muted">Bank {formatPrice(bank)} · max {MAX_PER_CLUB} per club</p>
        <div className="relative mt-3">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search players" className="field h-11 pl-10" data-autofocus aria-label="Search players" />
        </div>
        <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
          <select value={club} onChange={(e) => setClub(e.target.value)} className="field h-10 text-sm" aria-label="Club">
            <option value="">All clubs</option>
            {clubs.map(([short, name]) => (
              <option key={short} value={short}>{name}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field h-10 text-sm" aria-label="Sort">
            <option value="points">Most points</option>
            <option value="price">Highest price</option>
            <option value="cheap">Lowest price</option>
          </select>
          <button type="button" onClick={() => setAffordable((a) => !a)} className={cn("h-10 rounded-xl border px-3 text-sm font-semibold", affordable ? "border-navy bg-navy text-white" : "border-line text-muted")}>
            Affordable
          </button>
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto overscroll-contain">
        {list.map((p) => {
          const reason = taken.has(p.id)
            ? "In squad"
            : (perClub.get(p.clubId) ?? 0) >= MAX_PER_CLUB
              ? `3 from ${p.club}`
              : p.price > bank
                ? "Too pricey"
                : null;
          return (
            <li key={p.id}>
              <button
                type="button"
                disabled={!!reason}
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-3 border-b border-line/60 px-4 py-2.5 text-left transition-colors hover:bg-gray-100 disabled:opacity-40"
              >
                <Shirt primary={p.primary} secondary={p.secondary} size={30} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    {p.club}
                    {p.next && (
                      <span className={cn("rounded px-1 text-[10px]", FDR_BG[p.next.fdr])}>
                        {p.next.opp} ({p.next.home ? "H" : "A"})
                      </span>
                    )}
                    {reason && <span className="text-danger">· {reason}</span>}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold">{(p.price / 10).toFixed(1)}</span>
                  <span className="block text-[11px] text-muted">{p.totalPoints} pts</span>
                </span>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="p-6 text-center text-muted">No players match.</li>}
      </ul>
    </Sheet>
  );
}
