import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronLeft, MessageCircle, Smartphone, Trash2, UsersRound, Watch } from "lucide-react";
import { deleteActivity } from "@/actions/running";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatTime } from "@/lib/format";
import { km, paceOrSpeed, raceTime } from "@/lib/running/format";
import { getActivity } from "@/lib/running/queries";
import { EFFORTS, effortLabel } from "@/lib/running/track";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Tick } from "@/components/ui/tick";
import { LikeButton, ShareButton } from "@/components/feed/buttons";
import { InlineVideo } from "@/components/video/inline-video";
import { ElevationChart, FLAG_LABEL, RunPoster, SplitsTable } from "@/components/run/run-card";
import { ReelMaker } from "@/components/run/reel-maker";
import { ActivityEditor, NewRunCelebration } from "@/components/run/activity-tools";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({ params, searchParams }: PageProps<"/run/a/[id]">) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const data = await getActivity(id, user.id, user.isAdmin);
  if (!data) notFound();
  const fresh = (await searchParams).new === "1";
  const { a, own, efforts, pongezi } = data;
  const order = new Map<string, number>(EFFORTS.map((e, i) => [e.key, i]));
  const sorted = [...efforts].sort((x, y) => (order.get(x.effort) ?? 0) - (order.get(y.effort) ?? 0));
  const prs = sorted.filter((e) => e.isPr);
  const ps = paceOrSpeed(a.sport, a.distanceM, a.movingS);
  const hasReel = !!data.videoId;
  const trialEvent = sorted.filter((e) => ["5k", "10k", "half", "marathon"].includes(e.effort)).pop();

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      {fresh && <NewRunCelebration wins={prs.length} />}
      <Link href={own ? "/run" : `/u/${data.user.handle}`} className="pressable inline-flex items-center gap-1 text-[13px] font-semibold text-muted hover:text-ink">
        <ChevronLeft size={16} /> {own ? "Riadha Run" : data.user.displayName}
      </Link>

      <div className="flex items-center gap-3">
        <Link href={`/u/${data.user.handle}`}>
          <Avatar name={data.user.displayName} url={data.user.avatarUrl} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-semibold">
            <Link href={`/u/${data.user.handle}`} className="truncate">{data.user.displayName}</Link>
            <Tick role={data.user.role} verified={data.user.verified} size={15} />
          </p>
          <p className="flex items-center gap-1 text-[12px] text-muted">
            {formatDate(a.startedAt, { weekday: "long", day: "numeric", month: "long" })} · {formatTime(a.startedAt)}
            {a.device && (
              <>
                {" · "}
                {a.source === "recorded" ? <Smartphone size={12} /> : <Watch size={12} />} {a.device}
              </>
            )}
          </p>
        </div>
      </div>

      {fresh && (prs.length > 0 || a.flag) && (
        <div className={a.flag ? "rounded-2xl border border-warning/50 bg-warning/15 p-4 text-[14px]" : "rounded-2xl bg-green p-4 text-navy"}>
          {a.flag ? (
            <p>{FLAG_LABEL[a.flag]}. It stays in your log, but leaderboards, PRs and challenges only count honest runs.</p>
          ) : (
            <>
              <p className="text-[18px] font-bold tracking-[-0.02em]">{prs.length === 1 ? "New personal record!" : `${prs.length} new personal records!`}</p>
              <p className="mt-0.5 text-[14px]">{prs.map((e) => `${effortLabel(e.effort)} ${raceTime(e.ms)}`).join(" · ")}</p>
            </>
          )}
        </div>
      )}

      {hasReel && data.videoUrl ? (
        <div className="relative aspect-[9/16] max-h-[70vh] overflow-hidden rounded-[28px] bg-navy">
          <InlineVideo src={data.videoUrl} poster={data.posterUrl} className="absolute inset-0" />
        </div>
      ) : null}
      <RunPoster a={a} variant="hero" draw={fresh} />

      {data.postId && (
        <section className="flex items-center gap-3 rounded-2xl bg-navy p-3 text-white">
          <LikeButton postId={data.postId} liked={data.liked} likes={data.likes} signedIn pongezi />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">{data.likes ? `${data.likes} pongezi` : "Be the first to say pongezi"}</p>
            <div className="mt-1 flex -space-x-2">
              {pongezi.map((p) => (
                <Avatar key={p.handle} name={p.displayName} url={p.avatarUrl} size={24} className="ring-2 ring-navy" />
              ))}
            </div>
          </div>
          <Link href={`/p/${data.postId}`} className="flex flex-col items-center gap-1 text-[11px] font-semibold">
            <span className="glass-dark grid h-11 w-11 place-items-center rounded-full"><MessageCircle size={19} /></span>
            {data.comments}
          </Link>
        </section>
      )}

      {data.event && data.community && (
        <Link href={`/c/${data.community.slug}/events/${data.event.id}`} className="card pressable flex items-center gap-3 p-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-cobalt text-white"><UsersRound size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-muted">Group run with {data.community.name}</span>
            <span className="block truncate font-semibold">{data.event.title}</span>
          </span>
        </Link>
      )}

      {sorted.length > 0 && (
        <section>
          <h2 className="h5">Best efforts</h2>
          <ul className="card mt-2 divide-y divide-line/70 overflow-hidden">
            {sorted.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="font-semibold">{effortLabel(e.effort)}</span>
                <span className="flex items-center gap-2 tabular">
                  {e.isPr && <span className="rounded bg-green px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy">PR</span>}
                  {raceTime(e.ms)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.splits.km.length + (a.splits.rest ? 1 : 0) > 1 && (
        <section>
          <h2 className="h5">Splits</h2>
          <div className="card mt-2 px-4 py-1">
            <SplitsTable splits={a.splits} sport={a.sport} />
          </div>
        </section>
      )}

      {a.profile.ele.length > 1 && (
        <section>
          <h2 className="h5">Elevation · {a.elevationGainM} m climbed</h2>
          <div className="card mt-2 p-4">
            <ElevationChart ele={a.profile.ele} />
          </div>
        </section>
      )}

      {own && (
        <section className="flex flex-col gap-3">
          <h2 className="h5">Share and verify</h2>
          <ShareButton path={`/run/a/${a.id}`} title={`${a.title} · Riadha Run`} dark={false} />
          {data.postId && !a.isPrivate ? (
            <ReelMaker
              postId={data.postId}
              label={hasReel ? "Make a new reel" : "Make a Run Reel"}
              className="btn-lg btn-block"
              input={{
                kind: "run",
                title: a.title,
                kicker: `${a.sport === "ride" ? "Riadha Ride" : "Riadha Run"} · ${formatDate(a.startedAt, { day: "numeric", month: "short" })}`,
                name: data.user.displayName,
                date: formatDate(a.startedAt, { day: "numeric", month: "long", year: "numeric" }),
                distanceM: a.distanceM,
                movingS: a.movingS,
                elevationGainM: a.elevationGainM,
                pace: [ps.value, ps.unit === "/km" ? "/km" : ` ${ps.unit}`],
                splits: a.splits.km,
                profilePace: a.profile.pace,
                art: a.routeArt,
              }}
            />
          ) : (
            <p className="rounded-xl bg-gray-100 px-4 py-3 text-[13px] text-muted">This run is only visible to you. Share it with everyone to make a reel.</p>
          )}
          {a.sport === "run" && !a.flag && (
            <Link href={`/run/trials?activity=${a.id}${trialEvent ? `&event=${trialEvent.effort}&time=${encodeURIComponent(raceTime(trialEvent.ms))}` : ""}`} className="btn btn-secondary btn-block">
              <BadgeCheck size={16} /> Get a time from this run verified
            </Link>
          )}
          <details className="card overflow-hidden">
            <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold">Edit</summary>
            <div className="border-t border-line p-4">
              <ActivityEditor id={a.id} title={a.title} isPrivate={a.isPrivate} />
            </div>
          </details>
          <ConfirmButton action={deleteActivity.bind(null, a.id)} confirm="Delete this activity? Its post, PRs and points are removed." className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-danger">
            <Trash2 size={14} /> Delete activity
          </ConfirmButton>
        </section>
      )}

      <p className="pb-2 text-[12px] text-muted">
        {km(a.distanceM)} km · {ps.value}
        {ps.unit === "/km" ? "/km" : ` ${ps.unit}`} · Routes on Riadha are shapes only, with the start and finish cut off{data.minor ? "; runners under 18 never show a route" : ""}.
      </p>
    </div>
  );
}
