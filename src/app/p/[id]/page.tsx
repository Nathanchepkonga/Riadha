import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Trash2 } from "lucide-react";
import { deletePost } from "@/actions/social";
import { getCurrentUser } from "@/lib/auth/session";
import { getComments, getPosts } from "@/lib/queries";
import { postTitle } from "@/lib/posts";
import { RunPoster } from "@/components/run/run-card";
import { GeneratedLink, GeneratedPoster } from "@/components/run/posters";
import { cn, formatDate } from "@/lib/format";
import { LikeButton, ShareButton } from "@/components/feed/buttons";
import { CommentThread } from "@/components/feed/comments";
import { ReportButton } from "@/components/feed/report-button";
import { InlineVideo } from "@/components/video/inline-video";
import { ProcessingNotice } from "@/components/video/processing-notice";
import { StatBackdrop } from "@/components/sport/cards";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/nav";
import { Tick } from "@/components/ui/tick";
import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";

async function load(id: string) {
  const postId = Number(id);
  if (!Number.isInteger(postId)) return null;
  const viewer = await getCurrentUser();
  const [post] = await getPosts({ viewerId: viewer?.id, postId, limit: 1 });
  return post ? { post, viewer } : null;
}

export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return {};
  const { post } = data;
  return {
    title: `${post.author.displayName} · ${postTitle(post)}`,
    description: (post.body || postTitle(post)).slice(0, 160),
  };
}

/** Post detail in the UI kit's article layout: hero media, tag, headline, author meta, body. */
export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { post, viewer } = data;
  const canDelete = viewer && (viewer.id === post.author.id || viewer.isAdmin);
  const comments = await getComments(post.id);
  const headline = postTitle(post);
  const run = post.kind === "activity" ? post.activity : null;
  const generated = post.kind !== "post" && post.kind !== "activity";
  const posterCard = (!!run || generated) && !(post.mediaType === "video" && post.mediaUrl);

  return (
    <>
      {viewer ? <TopBar user={{ handle: viewer.handle, isAdmin: viewer.isAdmin }} back={{ href: "/feed", label: "Back" }} /> : <TopBar user={null} />}
      <main className="pb-tabbar mx-auto max-w-[480px]">
        {post.hiddenReason && (
          <p role="status" className="flex items-start gap-2 bg-danger/10 px-4 py-3 text-[13px]">
            <span className="font-semibold">Hidden from Riadha:</span> {post.hiddenReason}. Only you can see this post.
          </p>
        )}
        <div className={cn("relative w-full overflow-hidden bg-navy", post.mediaType === "video" || posterCard ? "aspect-[4/5]" : "aspect-[4/3]")}>
          {posterCard && run ? (
            <RunPoster a={run} />
          ) : posterCard ? (
            <GeneratedPoster kind={post.kind} data={post.data} />
          ) : post.videoId && !post.published ? (
            <ProcessingNotice videoId={post.videoId} />
          ) : post.mediaType === "video" && post.mediaUrl ? (
            <InlineVideo src={post.mediaUrl} poster={post.posterUrl} className="absolute inset-0" />
          ) : post.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
            <img src={post.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <StatBackdrop seed={post.id} />
              {post.statValue && (
                <div className="absolute inset-x-5 bottom-6 text-white">
                  <p className="kicker text-white/60">{post.statLabel}</p>
                  <p className="mt-1 text-[84px] font-bold leading-[0.85] tracking-[-0.05em]">{post.statValue}</p>
                </div>
              )}
            </>
          )}
          {!viewer && (
            <Link href={`/u/${post.author.handle}`} className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-navy/70 px-3 py-1.5 text-[13px] font-semibold text-white backdrop-blur">
              <ChevronLeft size={15} /> {post.author.displayName}
            </Link>
          )}
        </div>

        <article className="px-4 pt-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone="green">{run || generated ? "Riadha Run" : (post.author.sport ?? "Showcase")}</Tag>
            {post.location && <Tag tone="gray" icon={<MapPin size={10} />} className="normal-case tracking-normal">{post.location}</Tag>}
          </div>
          <h1 className="h3 mt-3">{headline}</h1>
          <p className="mt-2 text-[12px] text-muted">
            <span className="font-semibold text-cobalt">{post.author.sport ?? "Riadha"}</span> · {formatDate(post.createdAt, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>

          <Link href={`/u/${post.author.handle}`} className="card mt-5 flex items-center gap-3 p-3">
            <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-semibold">
                <span className="truncate">{post.author.displayName}</span>
                <Tick role={post.author.role} verified={post.author.verified} size={15} />
              </span>
              <span className="text-[12px] text-muted">@{post.author.handle}</span>
            </span>
            <span className="text-[13px] font-semibold text-cobalt">Profile</span>
          </Link>

          {post.body && !generated && <p className="mt-5 whitespace-pre-line text-[16px] leading-relaxed">{post.body}</p>}
          {run && (
            <Link href={`/run/a/${run.id}`} className="btn btn-secondary btn-block mt-5">See the splits, best efforts and route</Link>
          )}
          {generated && (
            <div className="mt-3 rounded-xl bg-navy px-4 pb-3 pt-1">
              <GeneratedLink kind={post.kind} data={post.data} />
            </div>
          )}

          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-navy p-3">
            <LikeButton postId={post.id} liked={post.liked} likes={post.likes} signedIn={!!viewer} pongezi={post.kind !== "post"} />
            <ShareButton path={`/p/${post.id}`} title={`${post.author.displayName} on Riadha`} />
            {canDelete && (
              <form action={deletePost.bind(null, post.id)} className="ml-auto">
                <button className="btn btn-ghost-light btn-sm">
                  <Trash2 size={14} /> Delete
                </button>
              </form>
            )}
          </div>
          {viewer && viewer.id !== post.author.id && (
            <div className="mt-3 flex justify-end">
              <ReportButton postId={post.id} />
            </div>
          )}

          <section className="mt-8" aria-labelledby="comments-title">
            <h2 id="comments-title" className="h5">
              Comments <span className="text-muted">{comments.length || ""}</span>
            </h2>
            <div className="card mt-3 overflow-hidden">
              <CommentThread postId={post.id} postAuthorId={post.author.id} viewer={viewer ? { id: viewer.id, isAdmin: viewer.isAdmin } : null} initial={comments} className="max-h-[70dvh]" />
            </div>
          </section>

          {!viewer && (
            <div className="card mt-6 p-5 text-center">
              <p className="h5">Join Riadha</p>
              <p className="mt-1 text-sm text-muted">Follow {post.author.displayName.split(" ")[0]}, play KPL fantasy and post your own highlights.</p>
              <Link href="/login" className="btn btn-accent mt-4">Get started</Link>
            </div>
          )}
        </article>
      </main>
      {viewer && <TabBar handle={viewer.handle} />}
    </>
  );
}
