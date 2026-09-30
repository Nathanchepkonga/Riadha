"use client";

import { useMemo, useState, useTransition } from "react";
import { saveLineup } from "@/actions/fantasy";
import { POSITION_LABEL, formatPrice, validateXI, type Pos } from "@/lib/fantasy/rules";
import type { Pick } from "@/lib/fantasy/lineup";
import { cn } from "@/lib/format";
import { Sheet } from "@/components/ui/overlay";
import { Bench, FDR_BG, Pitch, PitchRow, PlayerChip, type ChipState } from "./pitch";

export type LitePlayer = {
  id: number;
  name: string;
  position: Pos;
  price: number;
  club: string;
  clubName: string;
  primary: string;
  secondary: string;
  totalPoints: number;
  lastPoints: number;
  next: { opp: string; home: boolean; fdr: number } | null;
};

const ORDER: Pos[] = ["GK", "DEF", "MID", "FWD"];

function swap(lineup: Pick[], a: number, b: number) {
  const pa = lineup.find((p) => p.playerId === a)!;
  const pb = lineup.find((p) => p.playerId === b)!;
  const aStarts = pa.slot <= 11;
  const bStarts = pb.slot <= 11;
  return lineup.map((p) => {
    if (p.playerId === a) {
      // A benched starter hands its armband to whoever replaces it.
      const flags = aStarts && !bStarts ? { isCaptain: false, isVice: false } : !aStarts && bStarts ? { isCaptain: pb.isCaptain, isVice: pb.isVice } : {};
      return { ...p, slot: pb.slot, ...flags };
    }
    if (p.playerId === b) {
      const flags = bStarts && !aStarts ? { isCaptain: false, isVice: false } : !bStarts && aStarts ? { isCaptain: pa.isCaptain, isVice: pa.isVice } : {};
      return { ...p, slot: pa.slot, ...flags };
    }
    return p;
  });
}

export function LineupEditor({ initial, players, editable }: { initial: Pick[]; players: Record<number, LitePlayer>; editable: boolean }) {
  const [lineup, setLineup] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [subbing, setSubbing] = useState(false);
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();

  const posOf = (id: number) => players[id].position;
  const dirty = JSON.stringify([...lineup].sort((a, b) => a.slot - b.slot)) !== JSON.stringify([...initial].sort((a, b) => a.slot - b.slot));
  const starters = lineup.filter((p) => p.slot <= 11);
  const bench = lineup.filter((p) => p.slot > 11).sort((a, b) => a.slot - b.slot);
  const formation = ORDER.slice(1).map((pos) => starters.filter((p) => posOf(p.playerId) === pos).length).join("-");

  const eligible = useMemo(() => {
    if (!subbing || selected === null) return new Set<number>();
    const sel = lineup.find((p) => p.playerId === selected)!;
    const out = new Set<number>();
    for (const other of lineup) {
      if (other.playerId === selected) continue;
      const selStarts = sel.slot <= 11;
      const otherStarts = other.slot <= 11;
      if (selStarts && otherStarts) continue;
      const gk = posOf(selected) === "GK";
      if (gk !== (posOf(other.playerId) === "GK")) continue;
      if (!selStarts && !otherStarts) {
        if (!gk) out.add(other.playerId); // reorder the outfield bench
        continue;
      }
      const trial = swap(lineup, selected, other.playerId).filter((p) => p.slot <= 11);
      if (validateXI(trial.map((p) => posOf(p.playerId))) === null) out.add(other.playerId);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subbing, selected, lineup]);

  function tap(id: number) {
    if (!editable) return setSelected(id);
    if (subbing) {
      if (eligible.has(id)) {
        setLineup((l) => swap(l, selected!, id));
        setMessage(null);
      }
      setSubbing(false);
      setSelected(null);
      return;
    }
    setSelected(id);
  }

  function setArmband(kind: "captain" | "vice") {
    if (selected === null) return;
    setLineup((l) =>
      l.map((p) => {
        if (kind === "captain") {
          if (p.playerId === selected) return { ...p, isCaptain: true, isVice: false };
          if (p.isCaptain) return { ...p, isCaptain: false, isVice: l.find((x) => x.playerId === selected)!.isVice };
          return p;
        }
        if (p.playerId === selected) return { ...p, isVice: true, isCaptain: false };
        if (p.isVice) return { ...p, isVice: false, isCaptain: l.find((x) => x.playerId === selected)!.isCaptain };
        return p;
      }),
    );
    setSelected(null);
  }

  function chipState(id: number): ChipState {
    if (!subbing) return selected === id ? "selected" : "normal";
    if (id === selected) return "selected";
    return eligible.has(id) ? "eligible" : "dimmed";
  }

  function chip(p: Pick) {
    const pl = players[p.playerId];
    return (
      <PlayerChip
        key={p.playerId}
        name={pl.name}
        primary={pl.primary}
        secondary={pl.secondary}
        captain={p.isCaptain}
        vice={p.isVice}
        sub={pl.next ? `${pl.next.opp} (${pl.next.home ? "H" : "A"})` : "–"}
        subTone={pl.next ? (`fdr${pl.next.fdr}` as "fdr1") : "dark"}
        state={chipState(p.playerId)}
        onClick={() => tap(p.playerId)}
        label={`${pl.name}, ${POSITION_LABEL[pl.position]}`}
      />
    );
  }

  const sel = selected !== null ? players[selected] : null;
  const selPick = selected !== null ? lineup.find((p) => p.playerId === selected) : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-xs text-muted">
        <span className="uppercase tracking-[0.12em]">Formation {formation}</span>
        {subbing ? <span className="font-semibold text-cobalt">Tap a highlighted player to swap</span> : editable ? <span>Tap a player for options</span> : <span>Deadline passed</span>}
      </div>
      <Pitch className="min-h-[430px]">
        {ORDER.map((pos) => (
          <PitchRow key={pos}>{starters.filter((p) => posOf(p.playerId) === pos).sort((a, b) => a.slot - b.slot).map(chip)}</PitchRow>
        ))}
      </Pitch>
      <Bench>{bench.map(chip)}</Bench>

      {message && (
        <p role={message.error ? "alert" : "status"} className={cn("mt-3 rounded-xl px-4 py-3 text-sm", message.error ? "border-l-4 border-danger bg-danger/8 text-ink" : "border-l-4 border-green bg-green/20 text-ink")}>
          {message.error ?? message.ok}
        </p>
      )}

      {dirty && editable && (
        <div className="sticky-above-tabbar z-20 mt-3 flex gap-2 rounded-2xl border border-line bg-surface/95 p-2 backdrop-blur">
          <button type="button" className="btn btn-secondary flex-1" onClick={() => setLineup(initial)} disabled={pending}>
            Reset
          </button>
          <button
            type="button"
            className="btn btn-primary flex-[2]"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await saveLineup(lineup);
                setMessage(res.error ? { error: res.error } : { ok: "Team saved. Good luck this gameweek!" });
              })
            }
          >
            {pending ? "Saving…" : "Save team"}
          </button>
        </div>
      )}

      {sel && selPick && !subbing && (
        <Sheet title={sel.name} onClose={() => setSelected(null)}>
          <p className="-mt-2 text-[11px] uppercase tracking-[0.12em] text-muted">
            {POSITION_LABEL[sel.position]} · {sel.clubName}
          </p>
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ["Price", formatPrice(sel.price).replace("KSh ", "")],
              ["Total", sel.totalPoints],
              ["Last GW", sel.lastPoints],
              ["Next", sel.next ? `${sel.next.opp} ${sel.next.home ? "H" : "A"}` : "–"],
            ].map(([k, v]) => (
              <div key={k as string} className={cn("rounded-xl bg-gray-100 py-2", k === "Next" && sel.next && FDR_BG[sel.next.fdr])}>
                <dt className="text-[10px] uppercase tracking-wider opacity-70">{k}</dt>
                <dd className="font-semibold tabular">{v}</dd>
              </div>
            ))}
          </dl>
          {editable ? (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-accent" disabled={selPick.slot > 11 || selPick.isCaptain} onClick={() => setArmband("captain")}>
                Make captain
              </button>
              <button type="button" className="btn btn-secondary" disabled={selPick.slot > 11 || selPick.isVice} onClick={() => setArmband("vice")}>
                Make vice
              </button>
              <button type="button" className="btn btn-primary col-span-2" onClick={() => setSubbing(true)}>
                Substitute
              </button>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Changes open again after this gameweek&apos;s deadline.</p>
          )}
        </Sheet>
      )}
    </div>
  );
}
