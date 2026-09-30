import { validateXI, type Pos } from "./rules";

export type Pick = { slot: number; playerId: number; isCaptain: boolean; isVice: boolean };
export type PlayerGw = { points: number; minutes: number };

export type ScoredPick = Pick & {
  points: number;
  multiplier: number;
  starter: boolean;
  subbedIn: boolean;
  subbedOut: boolean;
};

/**
 * Scores a 15-man lineup for one gameweek. Auto-subs and the vice-captain fallback only
 * apply once the gameweek is finished, because a starter on 0 minutes may still be due to play.
 */
export function scoreLineup(
  picks: Pick[],
  positionOf: (id: number) => Pos,
  statsOf: (id: number) => PlayerGw | undefined,
  finished: boolean,
) {
  const sorted = [...picks].sort((a, b) => a.slot - b.slot);
  const xi = sorted.filter((p) => p.slot <= 11).map((p) => p.playerId);
  const bench = sorted.filter((p) => p.slot > 11).map((p) => p.playerId);
  const played = (id: number) => (statsOf(id)?.minutes ?? 0) > 0;
  const subbedIn = new Set<number>();
  const subbedOut = new Set<number>();

  if (finished) {
    for (const starter of [...xi]) {
      if (played(starter)) continue;
      const isGk = positionOf(starter) === "GK";
      const candidates = bench.filter(
        (b) => !subbedIn.has(b) && played(b) && (positionOf(b) === "GK") === isGk,
      );
      for (const b of candidates) {
        const trial = xi.map((id) => (id === starter ? b : id));
        if (validateXI(trial.map(positionOf)) === null) {
          xi.splice(xi.indexOf(starter), 1, b);
          subbedIn.add(b);
          subbedOut.add(starter);
          break;
        }
      }
    }
  }

  const inXI = new Set(xi);
  const captain = sorted.find((p) => p.isCaptain)?.playerId;
  const vice = sorted.find((p) => p.isVice)?.playerId;
  let armband = captain;
  if (finished && captain !== undefined && !played(captain) && vice !== undefined && inXI.has(vice)) {
    armband = vice;
  }

  let total = 0;
  let benchPoints = 0;
  const scored: ScoredPick[] = sorted.map((p) => {
    const pts = statsOf(p.playerId)?.points ?? 0;
    const starter = inXI.has(p.playerId);
    const multiplier = starter ? (p.playerId === armband ? 2 : 1) : 0;
    if (starter) total += pts * multiplier;
    else benchPoints += pts;
    return {
      ...p,
      points: pts,
      multiplier,
      starter,
      subbedIn: subbedIn.has(p.playerId),
      subbedOut: subbedOut.has(p.playerId),
    };
  });

  return { total, benchPoints, picks: scored };
}
