// Pure fantasy rules shared by the client (instant feedback) and the server (source of truth).

export type Pos = "GK" | "DEF" | "MID" | "FWD";

export const POSITIONS: Pos[] = ["GK", "DEF", "MID", "FWD"];
export const POSITION_LABEL: Record<Pos, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

/** Budget in tenths of a million KSh (1000 = KSh 100.0m). */
export const BUDGET = 1000;
export const SQUAD_SIZE = 15;
export const SQUAD_SHAPE: Record<Pos, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
export const MAX_PER_CLUB = 3;
export const MAX_FREE_TRANSFERS = 2;
export const HIT_COST = 4;
/** Min/max starters per position in the XI. */
export const XI_LIMITS: Record<Pos, [number, number]> = {
  GK: [1, 1],
  DEF: [3, 5],
  MID: [2, 5],
  FWD: [1, 3],
};

export type SquadPlayer = { id: number; position: Pos; clubId: number; price: number };

export function formatPrice(tenths: number) {
  return `KSh ${(tenths / 10).toFixed(1)}m`;
}

/** Returns an error message, or null when the 15-man squad is valid. */
export function validateSquad(squad: SquadPlayer[], budget = BUDGET): string | null {
  if (squad.length !== SQUAD_SIZE) return `Pick ${SQUAD_SIZE} players (you have ${squad.length}).`;
  if (new Set(squad.map((p) => p.id)).size !== squad.length) return "A player can only be picked once.";
  for (const pos of POSITIONS) {
    const n = squad.filter((p) => p.position === pos).length;
    if (n !== SQUAD_SHAPE[pos]) return `You need exactly ${SQUAD_SHAPE[pos]} ${POSITION_LABEL[pos].toLowerCase()}s.`;
  }
  const perClub = new Map<number, number>();
  for (const p of squad) perClub.set(p.clubId, (perClub.get(p.clubId) ?? 0) + 1);
  if ([...perClub.values()].some((n) => n > MAX_PER_CLUB)) return `Max ${MAX_PER_CLUB} players from one club.`;
  const cost = squad.reduce((s, p) => s + p.price, 0);
  if (cost > budget) return `Over budget by ${formatPrice(cost - budget)}.`;
  return null;
}

/** Validates a starting XI given each starter's position. */
export function validateXI(positions: Pos[]): string | null {
  if (positions.length !== 11) return "Your starting XI needs 11 players.";
  for (const pos of POSITIONS) {
    const n = positions.filter((p) => p === pos).length;
    const [min, max] = XI_LIMITS[pos];
    if (n < min || n > max) {
      return min === max
        ? `Start exactly ${min} ${POSITION_LABEL[pos].toLowerCase()}.`
        : `Start ${min}–${max} ${POSITION_LABEL[pos].toLowerCase()}s.`;
    }
  }
  return null;
}

/**
 * Default lineup for a fresh squad: 1-4-4-2, bench = GK then DEF, MID, FWD.
 * Captain is the priciest starter, vice the next.
 */
export function defaultLineup(squad: SquadPlayer[]) {
  const by = (pos: Pos) => squad.filter((p) => p.position === pos).sort((a, b) => b.price - a.price);
  const gk = by("GK"), def = by("DEF"), mid = by("MID"), fwd = by("FWD");
  const starters = [gk[0], ...def.slice(0, 4), ...mid.slice(0, 4), ...fwd.slice(0, 2)];
  const bench = [gk[1], def[4], mid[4], fwd[2]];
  const ranked = [...starters].sort((a, b) => b.price - a.price);
  return [...starters, ...bench].map((p, i) => ({
    slot: i + 1,
    playerId: p.id,
    isCaptain: p.id === ranked[0].id,
    isVice: p.id === ranked[1].id,
  }));
}

/** Free transfers available each gameweek, and the hit taken, from transfers made per gameweek. */
export function transferLedger(startGw: number, uptoGw: number, made: Map<number, number>) {
  const out = new Map<number, { free: number; made: number; hits: number }>();
  let free = 0;
  for (let gw = startGw; gw <= uptoGw; gw++) {
    const m = made.get(gw) ?? 0;
    if (gw === startGw) {
      out.set(gw, { free: Infinity, made: m, hits: 0 });
      free = 1;
      continue;
    }
    out.set(gw, { free, made: m, hits: Math.max(0, m - free) * HIT_COST });
    free = Math.min(MAX_FREE_TRANSFERS, Math.max(0, free - m) + 1);
  }
  return out;
}
