import type { Metadata } from "next";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getEntry, getPlayerPool } from "@/lib/fantasy/data";
import { ensurePicksFor, getEffectivePicks, getNextGameweek, getTransferState } from "@/lib/fantasy/engine";
import { countdown } from "@/lib/format";
import { SquadBuilder } from "@/components/fantasy/squad-builder";

export const metadata: Metadata = { title: "Squad" };

export default async function SquadPage({ searchParams }: PageProps<"/fantasy/squad">) {
  const { join } = await searchParams;
  const user = await requireUser();
  const [entry, next, pool] = await Promise.all([getEntry(user.id), getNextGameweek(db), getPlayerPool()]);

  if (!next) {
    return <p className="p-6 text-center text-muted">The season is over. Transfers reopen next season.</p>;
  }

  if (!entry) {
    return (
      <div className="px-3 pt-4">
        <Header overline="New team" title="Pick your squad" deadline={countdown(next.deadline)} gw={next.id} />
        <SquadBuilder mode="create" pool={pool} joinCode={typeof join === "string" ? join : undefined} />
      </div>
    );
  }

  const picks = await ensurePicksFor(db, entry.id, next.id);
  const unlimited = next.id === entry.startGameweekId;
  const [transfer, prev] = await Promise.all([
    getTransferState(db, entry, next.id),
    unlimited ? null : getEffectivePicks(db, entry.id, next.id - 1),
  ]);

  return (
    <div className="px-3 pt-4">
      <Header overline={entry.teamName} title="Transfers" deadline={countdown(next.deadline)} gw={next.id} />
      <SquadBuilder
        mode="transfers"
        pool={pool}
        initialIds={picks.map((p) => p.playerId)}
        prevIds={prev ? prev.picks.map((p) => p.playerId) : null}
        {...(unlimited ? {} : { freeTransfers: transfer.free })}
      />
    </div>
  );
}

function Header({ overline, title, deadline, gw }: { overline: string; title: string; deadline: string; gw: number }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <div className="min-w-0">
        <p className="kicker truncate">{overline}</p>
        <h1 className="h2">{title}</h1>
      </div>
      <span className="shrink-0 rounded-full bg-navy px-3 py-1.5 text-[11px] font-semibold text-white tabular">
        GW{gw} · {deadline}
      </span>
    </div>
  );
}
