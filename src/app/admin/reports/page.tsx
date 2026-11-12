import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { deletePostAsAdmin, dismissReports, hidePost, restorePost } from "@/actions/moderation";
import { db } from "@/db";
import { contentReports, posts, users } from "@/db/schema";
import { reportReasonLabel } from "@/lib/constants";
import { formatDate, timeAgo } from "@/lib/format";
import { StatBackdrop } from "@/components/sport/cards";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { VideoThumb } from "@/components/video/thumb";

export const metadata: Metadata = { title: "Reports · Admin" };

function Preview({ p }: { p: { id: number; mediaUrl: string | null; mediaType: string | null; posterUrl: string | null; statLabel: string | null; statValue: string | null } }) {
  return (
    <Link href={`/p/${p.id}`} className="relative block h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-navy text-white">
      {p.mediaType === "video" && p.mediaUrl ? (
        <VideoThumb src={p.mediaUrl} poster={p.posterUrl} seed={p.id} />
      ) : p.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user upload
        <img src={p.mediaUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <StatBackdrop seed={p.id} />
          {p.statValue && <span className="absolute inset-x-2 bottom-2 text-[18px] font-bold leading-none">{p.statValue}</span>}
        </>
      )}
    </Link>
  );
}

export default async function ReportsAdmin() {
  const open = await db
    .select({
      post: { id: posts.id, body: posts.body, mediaUrl: posts.mediaUrl, mediaType: posts.mediaType, posterUrl: posts.posterUrl, statLabel: posts.statLabel, statValue: posts.statValue, hiddenAt: posts.hiddenAt, hiddenReason: posts.hiddenReason, createdAt: posts.createdAt },
      author: { handle: users.handle, displayName: users.displayName, dateOfBirth: users.dateOfBirth },
      reports: sql<number>`count(*)::int`,
      reasons: sql<string[]>`array_agg(distinct ${contentReports.reason})`,
      notes: sql<string[]>`array_remove(array_agg(${contentReports.note}), null)`,
      latest: sql<string>`max(${contentReports.createdAt})::text`,
    })
    .from(contentReports)
    .innerJoin(posts, eq(posts.id, contentReports.postId))
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(eq(contentReports.status, "open"))
    .groupBy(posts.id, users.id)
    .orderBy(sql`bool_or(${contentReports.reason} = 'minor_safety') desc`, desc(sql`count(*)`), desc(sql`max(${contentReports.createdAt})`))
    .limit(100);

  const hidden = await db
    .select({ id: posts.id, body: posts.body, hiddenAt: posts.hiddenAt, hiddenReason: posts.hiddenReason, handle: users.handle })
    .from(posts)
    .innerJoin(users, eq(users.id, posts.authorId))
    .where(isNotNull(posts.hiddenAt))
    .orderBy(desc(posts.hiddenAt))
    .limit(50);

  return (
    <div>
      <h1 className="h2">Reports</h1>
      <p className="mt-1 text-sm text-muted">
        {open.length} post{open.length === 1 ? "" : "s"} waiting. Child-safety reports come first. Posts with 3+ reports are already hidden until you decide.
      </p>

      <ul className="mt-4 flex flex-col gap-3">
        {open.map(({ post: p, author, reports, reasons, notes, latest }) => (
          <li key={p.id} className="card p-4">
            <div className="flex gap-3">
              <Preview p={p} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <Link href={`/u/${author.handle}`} className="font-semibold hover:underline">{author.displayName}</Link>{" "}
                  <span className="text-muted">· posted {formatDate(p.createdAt)} · last report {timeAgo(new Date(latest))}</span>
                </p>
                {p.body && <p className="mt-1 line-clamp-2 text-sm">{p.body}</p>}
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">{reports} report{reports === 1 ? "" : "s"}</span>
                  {reasons.map((r) => (
                    <span key={r} className={r === "minor_safety" ? "rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white" : "rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold"}>
                      {reportReasonLabel(r)}
                    </span>
                  ))}
                  {p.hiddenAt && <span className="rounded-full bg-navy px-2 py-0.5 text-[11px] font-semibold text-white">Hidden</span>}
                </p>
                {notes.length > 0 && <p className="mt-2 text-xs italic text-muted">“{notes.slice(0, 2).join("” · “")}”</p>}
              </div>
            </div>
            <form className="mt-3 flex flex-col gap-2 border-t border-line pt-3 sm:flex-row">
              <input name="reason" placeholder="Reason shown to the author (optional)" className="field h-10 flex-1 md:text-sm" />
              <button formAction={hidePost.bind(null, p.id)} className="btn btn-primary h-10">Hide post</button>
              <button formAction={dismissReports.bind(null, p.id)} className="btn btn-secondary h-10">Dismiss</button>
            </form>
            <ConfirmButton action={deletePostAsAdmin.bind(null, p.id)} confirm="Delete this post and its clip permanently? Use this for illegal content." className="mt-2 text-xs font-semibold text-danger">
              Delete permanently
            </ConfirmButton>
          </li>
        ))}
        {open.length === 0 && <li className="card p-6 text-center text-muted">No open reports.</li>}
      </ul>

      {hidden.length > 0 && (
        <>
          <h2 className="h5 mt-10">Hidden posts</h2>
          <ul className="card mt-2 divide-y divide-line/70 text-sm">
            {hidden.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <Link href={`/p/${h.id}`} className="block truncate font-semibold hover:underline">{h.body || `Post #${h.id}`}</Link>
                  <span className="text-xs text-muted">@{h.handle} · {h.hiddenReason} · {h.hiddenAt ? timeAgo(h.hiddenAt) : ""}</span>
                </span>
                <form>
                  <button formAction={restorePost.bind(null, h.id)} className="text-xs font-semibold text-cobalt">Restore</button>
                </form>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
