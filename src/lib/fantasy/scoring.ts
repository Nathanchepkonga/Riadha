import type { Pos } from "./rules";

export type StatLine = {
  minutes: number;
  goals: number;
  assists: number;
  saves: number;
  penSaved: number;
  penMissed: number;
  yellow: number;
  red: number;
  ownGoals: number;
  bonus: number;
  goalsConceded: number;
  cleanSheet: boolean;
};

const GOAL_POINTS: Record<Pos, number> = { GK: 10, DEF: 6, MID: 5, FWD: 4 };
const CLEAN_SHEET_POINTS: Record<Pos, number> = { GK: 4, DEF: 4, MID: 1, FWD: 0 };

export const SCORING_TABLE = [
  ["Played up to 59 min", "1"],
  ["Played 60+ min", "2"],
  ["Goal (GK / DEF / MID / FWD)", "10 / 6 / 5 / 4"],
  ["Assist", "3"],
  ["Clean sheet (GK, DEF / MID)", "4 / 1"],
  ["Every 3 saves (GK)", "1"],
  ["Penalty save", "5"],
  ["Penalty miss", "−2"],
  ["Every 2 goals conceded (GK, DEF)", "−1"],
  ["Yellow / red card", "−1 / −3"],
  ["Own goal", "−2"],
  ["Bonus (best 3 in a match)", "3 / 2 / 1"],
] as const;

export function basePoints(pos: Pos, s: StatLine) {
  if (s.minutes <= 0) return 0;
  let p = s.minutes >= 60 ? 2 : 1;
  p += s.goals * GOAL_POINTS[pos];
  p += s.assists * 3;
  if (s.cleanSheet && s.minutes >= 60) p += CLEAN_SHEET_POINTS[pos];
  if (pos === "GK") p += Math.floor(s.saves / 3);
  p += s.penSaved * 5;
  p -= s.penMissed * 2;
  if (pos === "GK" || pos === "DEF") p -= Math.floor(s.goalsConceded / 2);
  p -= s.yellow;
  p -= s.red * 3;
  p -= s.ownGoals * 2;
  return p;
}

export function totalPoints(pos: Pos, s: StatLine) {
  return s.minutes > 0 ? basePoints(pos, s) + s.bonus : 0;
}

/** Awards 3/2/1 bonus to the top base scorers in one match (ties share the higher award). */
export function awardBonus<T extends { base: number; minutes: number }>(rows: T[]): Map<T, number> {
  const ranked = rows.filter((r) => r.minutes > 0).sort((a, b) => b.base - a.base);
  const out = new Map<T, number>();
  let award = 3;
  let i = 0;
  while (award > 0 && i < ranked.length) {
    const score = ranked[i].base;
    const tied = ranked.filter((r) => r.base === score);
    for (const r of tied) out.set(r, award);
    i += tied.length;
    award -= tied.length;
  }
  return out;
}
