import { km } from "@/lib/running/format";

type Titled = {
  body: string;
  kind: string;
  statLabel: string | null;
  statValue: string | null;
  activity: { title: string; distanceM: number } | null;
  author: { displayName: string };
};

/** A one-line title for a post: the run, the generated summary, the stat, or the first sentence. */
export function postTitle(p: Titled) {
  if (p.activity) return `${p.activity.title} · ${km(p.activity.distanceM)} km`;
  if (p.kind !== "post" && p.body) return p.body;
  if (p.statValue) return `${p.statLabel}: ${p.statValue}`;
  return p.body.split(/(?<=[.!?])\s/)[0] || p.author.displayName;
}

/** When a run's post is dated: when the run finished (never in the future). */
export const runPostTime = (startedAt: Date, elapsedS: number) => new Date(Math.min(Date.now(), startedAt.getTime() + elapsedS * 1000));
