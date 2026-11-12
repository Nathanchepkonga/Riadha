/* Riadha Run constants shared by pages, actions and the seed. */

/** Events a time can be verified for. The keys line up with GPS best efforts (EFFORTS) where they overlap. */
export const TRIAL_EVENTS = [
  { key: "100m", label: "100m" },
  { key: "200m", label: "200m" },
  { key: "400m", label: "400m" },
  { key: "800m", label: "800m" },
  { key: "1500m", label: "1500m" },
  { key: "1mile", label: "1 mile" },
  { key: "3000m", label: "3000m" },
  { key: "3000msc", label: "3000m steeplechase" },
  { key: "5k", label: "5000m / 5K" },
  { key: "10k", label: "10,000m / 10K" },
  { key: "half", label: "Half marathon" },
  { key: "marathon", label: "Marathon" },
] as const;
export type TrialEvent = (typeof TRIAL_EVENTS)[number]["key"];
export const trialLabel = (k: string) => TRIAL_EVENTS.find((e) => e.key === k)?.label ?? k;

/** Who may count on a challenge, and how it looks. */
export const CHALLENGE_ACCENTS = ["green", "cobalt", "navy"] as const;
export type ChallengeAccent = (typeof CHALLENGE_ACCENTS)[number];

/** Privacy zone sizes a runner can pick. */
export const ZONE_RADII = [200, 400, 800] as const;

/** Community categories that get a Run League table. */
export const RUN_CATEGORIES = ["Running", "Athletics", "Cycling", "Hiking", "Fitness"];

/** Group runs match runs that start this close to the meeting point, in this window around the start. */
export const GROUP_RUN = { radiusM: 1500, earlyMin: 45, lateMin: 90 } as const;
