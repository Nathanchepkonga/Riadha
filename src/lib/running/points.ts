/*
 * Run League scoring: fantasy for runners. Points reward turning up and improving, not only raw speed,
 * so a beginner who runs four days and beats their own average can top a table full of elites. The fast
 * runners still get their own distance table.
 */

export const RUN_POINTS = {
  /** Per kilometre, by sport. */
  perKm: { run: 1, walk: 0.5, ride: 0.25 },
  /** Each day of the week with at least 1 km. */
  activeDay: 2,
  /** Week distance above your own average of the previous four weeks (needs some history). */
  beatAverage: 10,
  /** Each new personal record (best effort), up to `maxPrs` a week so PRs never outweigh the running. */
  pr: 5,
  maxPrs: 3,
  /** Each group run you turned up to. */
  groupRun: 3,
  /** Each challenge finished this week. */
  challenge: 10,
} as const;

export type WeekTotals = {
  runM: number;
  walkM: number;
  rideM: number;
  activeDays: number;
  prs: number;
  groupRuns: number;
  challenges: number;
  beatAverage: boolean;
};

export function weekPoints(w: WeekTotals) {
  const km = (w.runM * RUN_POINTS.perKm.run + w.walkM * RUN_POINTS.perKm.walk + w.rideM * RUN_POINTS.perKm.ride) / 1000;
  return Math.round(
    km +
      w.activeDays * RUN_POINTS.activeDay +
      (w.beatAverage ? RUN_POINTS.beatAverage : 0) +
      Math.min(w.prs, RUN_POINTS.maxPrs) * RUN_POINTS.pr +
      w.groupRuns * RUN_POINTS.groupRun +
      w.challenges * RUN_POINTS.challenge,
  );
}

/** "How points work", for the leagues page. */
export const POINTS_RULES = [
  { label: "Every km you run", value: "+1" },
  { label: "Every km walked / ridden", value: "+0.5 / +0.25" },
  { label: "Each active day (1 km+)", value: `+${RUN_POINTS.activeDay}` },
  { label: "Beat your 4-week average", value: `+${RUN_POINTS.beatAverage}` },
  { label: `New personal record (up to ${RUN_POINTS.maxPrs} a week)`, value: `+${RUN_POINTS.pr}` },
  { label: "Turn up to a group run", value: `+${RUN_POINTS.groupRun}` },
  { label: "Finish a challenge", value: `+${RUN_POINTS.challenge}` },
];
