import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/nav";
import { Tick } from "@/components/ui/tick";
import { StatBackdrop } from "@/components/sport/cards";
import type { FeedPost } from "@/lib/queries";
import { cn, timeAgo } from "@/lib/format";
import { LikeButton, ShareButton } from "./buttons";
import { CommentButton } from "./comments";

/** Full-bleed post card: media (or a navy stat poster), author + stat tag over a soft floor blur. */
export function PostCard({ post, signedIn, priority, viewer }: { post: FeedPost; signedIn: boolean; priority?: boolean; viewer?: { id: string; isAdmin: boolean } }) {
  const hasMedia = !!post.mediaUrl;
  return (
    <article className="relative overflow-hidden rounded-3xl bg-navy" aria-label={`Post by ${post.author.displayName}`}>
      <div className="relative aspect-[4/5] w-full">
        {post.mediaType === "video" && post.mediaUrl ? (
          <video src={post.mediaUrl} className="absolute inset-0 h-full w-full object-cover" controls playsInline muted loop preload="metadata" />
        ) : hasMedia ? (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
          <img src={post.mediaUrl!} alt="" loading={priority ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <StatBackdrop seed={post.id} />
            {post.statValue ? (
              <div className="absolute inset-x-5 top-6 text-white">
                <p className="kicker text-white/60">{post.statLabel}</p>
                <p className={cn("mt-2 font-bold leading-[0.85] tracking-[-0.05em]", post.statValue.length > 7 ? "text-[60px]" : "text-[92px]")}>{post.statValue}</p>
              </div>
            ) : (
              <p className="absolute inset-x-5 top-6 line-clamp-5 text-[30px] font-bold leading-[1.05] tracking-[-0.03em] text-white">{post.body}</p>
            )}
          </>
        )}

        <div className="floor-blur pointer-events-none absolute inset-x-0 bottom-0 h-3/5" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-navy/90 via-navy/40 to-transparent" />

        <div className="absolute bottom-20 right-3 z-10 flex flex-col gap-3">
          <LikeButton postId={post.id} liked={post.liked} likes={post.likes} signedIn={signedIn} />
          <CommentButton postId={post.id} postAuthorId={post.author.id} count={post.comments} viewer={viewer ?? null} />
          <ShareButton path={`/p/${post.id}`} title={`${post.author.displayName} on Riadha`} />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pr-16 text-white">
          <Link href={`/u/${post.author.handle}`} className="flex items-center gap-2 font-semibold">
            <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={32} className="ring-2 ring-white/20" />
            <span className="truncate">{post.author.displayName}</span>
            <Tick role={post.author.role} verified={post.author.verified} size={15} />
            <span className="text-xs font-normal text-white/60">· {timeAgo(post.createdAt)}</span>
          </Link>
          {(post.statValue || post.location) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.statValue && hasMedia && (
                <Tag tone="green">
                  {post.statLabel} · {post.statValue}
                </Tag>
              )}
              {post.location && (
                <Tag tone="glass" icon={<MapPin size={10} />} className="normal-case tracking-normal">
                  {post.location}
                </Tag>
              )}
            </div>
          )}
          {post.body && (hasMedia || post.statValue) && (
            <Link href={`/p/${post.id}`} className="mt-2 line-clamp-3 block text-[14px] leading-snug text-white/90">
              {post.body}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
