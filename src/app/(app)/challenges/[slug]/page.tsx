import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { CalendarDays, ChevronLeft, Flag, HeartHandshake, Store, UsersRound } from "lucide-react";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { cn, formatDate } from "@/lib/format";
import { km, raceTime } from "@/lib/running/format";
import { getChallenge } from "@/lib/running/queries";
import { Aurora } from "@/components/brand/graphics";
import { Avatar } from "@/components/ui/avatar";
import { ShareButton } from "@/components/feed/buttons";
import { ProgressBar, goalText, lastDay, windowText } from "@/components/run/challenge-card";
import { JoinChallengeButton, ShareMedalButton } from "@/components/run/challenge-buttons";
import { Medal } from "@/components/run/medal";
import { ReelMaker } from "@/components/run/reel-maker";

export async function generateMetadata({ params }: PageProps<"/challenges/[slug]">): Promise<Metadata> {
  const user = await requireUser();
  const c = await getChallenge((await params).slug, user.id);
  return c ? { title: c.c.title, description: c.c.tagline || goalText(c.c) } : { title: "Not found" };
}

export default async function ChallengePage({ params }: PageProps<"/challenges/[slug]">) {
  const user = await requireUser();
  const data = await getChallenge((await params).slug, user.id);
  if (!data) notFound();
  const { c, sponsor, entry, board, state, participants, finishers } = data;
  const done = !!entry?.completedAt;
  const [medalPost] = done
    ? await db.select({ id: posts.id, videoId: posts.videoId }).from(posts).where(and(eq(posts.authorId, user.id), eq(posts.kind, "medal"), sql`${posts.data}->>'slug' = ${c.slug}`))
    : [];

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/challenges" className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> Challenges
      </Link>

      <section className="relative isolate overflow-hidden rounded-[28px] bg-navy p-5 text-white">
        <Aurora intensity={0.8} />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <Medal goalM={c.goalM} accent={c.accent} locked={!done} size={84} className={done ? "animate-scale-in" : undefined} />
            <div className="scale-90">
              <ShareButton path={`/challenges/${c.slug}`} title={`${c.title} on Riadha`} />
            </div>
          </div>
          {(c.occasion || sponsor) && (
            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-green">{[c.occasion, sponsor ? `With ${sponsor.name}` : null].filter(Boolean).join(" · ")}</p>
          )}
          <h1 className="mt-1 text-[clamp(28px,8vw,36px)] font-bold leading-[1.05] tracking-[-0.035em]">{c.title}</h1>
          {c.tagline && <p className="mt-1 text-[15px] text-white/75">{c.tagline}</p>}
          <dl className="mt-4 flex flex-col gap-1.5 text-[14px] text-white/80">
            <div className="flex items-center gap-2">
              <Flag size={15} className="text-green" />
              <dt className="sr-only">Goal</dt>
              <dd>{goalText(c)}</dd>
            </div>
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-green" />
              <dt className="sr-only">When</dt>
              <dd>
                {c.endsAt ? `${formatDate(c.startsAt, { day: "numeric", month: "short" })} – ${formatDate(lastDay(c.endsAt), { day: "numeric", month: "short", year: "numeric" })}` : "Always open"} · {windowText(c)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <UsersRound size={15} className="text-green" />
              <dt className="sr-only">Runners</dt>
              <dd>
                {participants} joined · {finishers} finished
              </dd>
            </div>
          </dl>
          {entry && (
            <div className="mt-5 rounded-2xl bg-white/[.07] p-3">
              <ProgressBar value={done ? 1 : entry.progressM / c.goalM} dark />
              <p className="mt-2 flex justify-between text-[13px] tabular">
                <span className="font-semibold">{done ? "Finished 🎉" : `${km(entry.progressM)} of ${km(c.goalM)} km`}</span>
                {entry.bestMs ? <span className="text-white/70">Best {raceTime(entry.bestMs)}</span> : null}
              </p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {!done && <JoinChallengeButton id={c.id} joined={!!entry} ended={state === "ended"} />}
            {done && !medalPost && <ShareMedalButton id={c.id} />}
            {done && medalPost && (
              <ReelMaker
                postId={medalPost.id}
                label={medalPost.videoId ? "Make a new medal reel" : "Make a medal reel"}
                input={{
                  kind: "medal",
                  title: c.title,
                  kicker: `Riadha challenge${c.occasion ? ` · ${c.occasion}` : ""}`,
                  name: user.displayName,
                  date: formatDate(entry!.completedAt!, { day: "numeric", month: "long", year: "numeric" }),
                  distanceM: c.kind === "total" ? entry!.progressM : c.goalM,
                  movingS: 0,
                  elevationGainM: 0,
                  pace: ["", ""],
                  splits: [],
                  profilePace: [],
                  art: null,
                  medal: { goalM: c.goalM, accent: c.accent, time: entry!.bestMs ? raceTime(entry!.bestMs) : null },
                }}
              />
            )}
            {done && medalPost && (
              <Link href={`/p/${medalPost.id}`} className="btn btn-light btn-sm">See the post</Link>
            )}
          </div>
          {!entry && state === "live" && <p className="mt-3 text-[12px] text-white/60">Runs you already did since {formatDate(c.startsAt, { day: "numeric", month: "short" })} count straight away.</p>}
        </div>
      </section>

      {c.description && <p className="whitespace-pre-line text-[15px] leading-relaxed">{c.description}</p>}

      {c.cause && (
        <section className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
          <HeartHandshake size={20} className="mt-0.5 shrink-0 text-cobalt" />
          <div>
            <p className="font-semibold">For a cause</p>
            <p className="text-[14px] text-muted">{c.cause}</p>
          </div>
        </section>
      )}

      {sponsor && (
        <Link href={`/market/${sponsor.slug}`} className="card pressable flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-green"><Store size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-muted">Sponsored by</span>
            <span className="block truncate font-semibold">{sponsor.name}</span>
          </span>
          <span className="text-[13px] font-semibold text-cobalt">Visit →</span>
        </Link>
      )}

      <section>
        <h2 className="h5">{c.kind === "total" ? "Leaderboard" : finishers ? "Finishers" : "Runners"}</h2>
        {board.length === 0 ? (
          <p className="mt-2 text-[14px] text-muted">Nobody has joined yet. Be the first.</p>
        ) : (
          <ol className="card mt-2 divide-y divide-line/70 overflow-hidden">
            {board.map((r, i) => (
              <li key={r.user.id} className={cn("flex items-center gap-3 px-4 py-2.5", r.user.id === user.id && "bg-green/25")}>
                <span className="w-5 text-[13px] font-bold tabular text-muted">{i + 1}</span>
                <Avatar name={r.user.displayName} url={r.user.avatarUrl} size={32} />
                <Link href={`/u/${r.user.handle}`} className="min-w-0 flex-1 truncate text-[14px] font-semibold">{r.user.displayName}</Link>
                <span className="text-right text-[13px] tabular">
                  {r.e.completedAt ? (
                    <span className="font-semibold">{r.e.bestMs && c.maxMs ? raceTime(r.e.bestMs) : c.kind === "total" ? `${km(r.e.progressM)} km` : "✓ Finished"}</span>
                  ) : (
                    <span className="text-muted">{km(r.e.progressM)} km</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="pb-2 text-[12px] text-muted">
        Recorded and uploaded GPS activities count; runs that fail the honesty checks don&apos;t. Finishing earns +10 Run League points.
      </p>
    </div>
  );
}

