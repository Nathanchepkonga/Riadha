import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Trash2 } from "lucide-react";
import { deletePost } from "@/actions/social";
import { getCurrentUser } from "@/lib/auth/session";
import { getPosts } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { LikeButton, ShareButton } from "@/components/feed/buttons";
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
    title: `${post.author.displayName}${post.statValue ? ` · ${post.statLabel} ${post.statValue}` : ""}`,
    description: post.body.slice(0, 160),
  };
}

/** Post detail in the UI kit's article layout: hero media, tag, headline, author meta, body. */
export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { post, viewer } = data;
  const canDelete = viewer && (viewer.id === post.author.id || viewer.isAdmin);
  const headline = post.statValue ? `${post.statLabel}: ${post.statValue}` : (post.body.split(/(?<=[.!?])\s/)[0] ?? post.body);

  return (
    <>
      {viewer ? <TopBar user={{ handle: viewer.handle, isAdmin: viewer.isAdmin }} back={{ href: "/feed", label: "Back" }} /> : <TopBar user={null} />}
      <main className="pb-tabbar mx-auto max-w-[480px]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-navy">
          {post.mediaType === "video" && post.mediaUrl ? (
            <video src={post.mediaUrl} className="absolute inset-0 h-full w-full object-cover" controls playsInline preload="metadata" />
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
            <Tag tone="green">{post.author.sport ?? "Showcase"}</Tag>
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

          {post.body && <p className="mt-5 whitespace-pre-line text-[16px] leading-relaxed">{post.body}</p>}

          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-navy p-3">
            <LikeButton postId={post.id} liked={post.liked} likes={post.likes} signedIn={!!viewer} />
            <ShareButton path={`/p/${post.id}`} title={`${post.author.displayName} on Riadha`} />
            {canDelete && (
              <form action={deletePost.bind(null, post.id)} className="ml-auto">
                <button className="btn btn-ghost-light btn-sm">
                  <Trash2 size={14} /> Delete
                </button>
              </form>
            )}
          </div>

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
