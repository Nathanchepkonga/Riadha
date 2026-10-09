"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, MapPin, Pause, Plus, Volume2, VolumeX } from "lucide-react";
import { toggleFollow, toggleLike } from "@/actions/social";
import type { ServedAd } from "@/lib/ads";
import type { FeedPost } from "@/lib/queries";
import type { WatchPage } from "@/lib/watch";
import { burst, haptic } from "@/lib/celebrate";
import { cn, compact, timeAgo } from "@/lib/format";
import { LogoMark } from "@/components/brand/logo";
import { ShareButton } from "@/components/feed/buttons";
import { CommentButton } from "@/components/feed/comments";
import { AdReel } from "@/components/market/ad-card";
import { StatBackdrop } from "@/components/sport/cards";
import { Avatar } from "@/components/ui/avatar";
import { Tick } from "@/components/ui/tick";

type Viewer = { id: string; isAdmin: boolean };
type Item = { kind: "post"; post: FeedPost } | { kind: "ad"; ad: ServedAd; key: string };

const AD_EVERY = 5;

/** Interleave a sponsored reel after every few posts, cycling through the ads we were served. */
function interleave(posts: FeedPost[], ads: ServedAd[]): Item[] {
  const out: Item[] = [];
  posts.forEach((post, i) => {
    out.push({ kind: "post", post });
    if (ads.length && (i + 1) % AD_EVERY === 0) {
      const ad = ads[Math.floor(i / AD_EVERY) % ads.length];
      out.push({ kind: "ad", ad, key: `ad-${ad.id}-${i}` });
    }
  });
  return out;
}

/** The vertical, full-screen reel feed (TikTok pattern) in brand colours. */
export function WatchFeed({ initial, tab, viewer }: { initial: WatchPage; tab: "forYou" | "following"; viewer: Viewer }) {
  const [posts, setPosts] = useState(initial.posts);
  const [ads, setAds] = useState(initial.ads);
  const [nextOffset, setNextOffset] = useState(initial.nextOffset);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const loading = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const items = useMemo(() => interleave(posts, ads), [posts, ads]);

  // Which reel is on screen.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length]);

  // Load the next page a few reels before the end.
  useEffect(() => {
    if (nextOffset === null || loading.current || active < items.length - 3) return;
    loading.current = true;
    fetch(`/api/watch?tab=${tab}&offset=${nextOffset}`)
      .then((r) => r.json())
      .then((page: WatchPage) => {
        setPosts((p) => {
          const seen = new Set(p.map((x) => x.id));
          return [...p, ...page.posts.filter((x) => !seen.has(x.id))];
        });
        if (page.ads.length) setAds((a) => (a.length ? a : page.ads));
        setNextOffset(page.nextOffset);
      })
      .catch(() => setNextOffset(null))
      .finally(() => {
        loading.current = false;
      });
  }, [active, items.length, nextOffset, tab]);

  // Arrow keys move between reels on desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [role=dialog]")) return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const h = scroller.current?.clientHeight ?? 0;
      scroller.current?.scrollBy({ top: e.key === "ArrowDown" ? h : -h, behavior: "smooth" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 bg-navy text-white">
      {/* Top bar over the reels */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-navy/70 to-transparent pb-8 pt-[calc(var(--sat)+0.75rem)]">
        <div className="pointer-events-auto mx-auto flex max-w-[480px] items-center justify-between px-4">
          <Link href="/feed" aria-label="Back to Home" className="pressable grid h-10 w-10 place-items-center">
            <LogoMark className="w-8" />
          </Link>
          <nav aria-label="Watch feeds" className="flex items-center gap-5 text-[15px] font-semibold">
            {(["forYou", "following"] as const).map((t) => (
              <Link
                key={t}
                href={t === "forYou" ? "/watch" : "/watch?tab=following"}
                replace
                aria-current={tab === t ? "page" : undefined}
                className={cn("relative pb-1.5 transition-colors", tab === t ? "text-white" : "text-white/55 hover:text-white/80")}
              >
                {t === "forYou" ? "For you" : "Following"}
                {tab === t && <span className="absolute inset-x-1 bottom-0 h-[3px] -skew-x-[37.57deg] rounded-sm bg-green" />}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} aria-pressed={!muted} className="pressable glass-dark grid h-10 w-10 place-items-center rounded-full">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      <div ref={scroller} className="no-scrollbar mx-auto h-full max-w-[480px] snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {items.length === 0 && (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <p className="text-[24px] font-bold tracking-[-0.02em]">{tab === "following" ? "Nothing from your follows yet" : "No reels yet"}</p>
              <p className="mt-2 text-white/60">{tab === "following" ? "Follow athletes and clubs to fill this feed." : "Be the first to post a highlight."}</p>
              <Link href={tab === "following" ? "/discover" : "/post/new"} className="btn btn-accent mt-6">
                {tab === "following" ? "Discover athletes" : "Post a highlight"}
              </Link>
            </div>
          </div>
        )}
        {items.map((item, i) => (
          <section key={item.kind === "post" ? item.post.id : item.key} data-index={i} className="relative h-full w-full snap-start snap-always">
            {item.kind === "post" ? (
              <Reel post={item.post} active={i === active} near={Math.abs(i - active) <= 1} muted={muted} viewer={viewer} />
            ) : (
              <AdReel ad={item.ad} />
            )}
          </section>
        ))}
        {nextOffset !== null && items.length > 0 && (
          <div className="grid h-24 snap-start place-items-center text-white/50" aria-live="polite">
            <span className="skeleton-dark h-1 w-24 rounded-full" />
          </div>
        )}
      </div>
    </div>
  );
}

function Reel({ post, active, near, muted, viewer }: { post: FeedPost; active: boolean; near: boolean; muted: boolean; viewer: Viewer }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const [paused, setPaused] = useState(false);
  const [like, setLike] = useState({ liked: post.liked, likes: post.likes });
  const [following, setFollowing] = useState(post.followingAuthor || post.author.id === viewer.id);
  const [expanded, setExpanded] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [, start] = useTransition();
  const lastTap = useRef(0);
  const tapTimer = useRef(0);
  const isVideo = post.mediaType === "video" && !!post.mediaUrl;

  // Play only the reel on screen.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (active && !paused) v.play().catch(() => {});
    else v.pause();
    if (!active) v.currentTime = 0;
  }, [active, paused]);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  const doLike = useCallback(
    (force?: boolean) => {
      const nextLiked = force ? true : !like.liked;
      if (nextLiked === like.liked) return;
      setLike({ liked: nextLiked, likes: like.likes + (nextLiked ? 1 : -1) });
      start(async () => {
        const now = await toggleLike(post.id).catch(() => like.liked);
        if (now !== nextLiked) setLike(like);
      });
    },
    [like, post.id],
  );

  // Tap toggles play/pause on videos; double-tap anywhere likes, with a heart where you tapped.
  const onTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    const now = Date.now();
    if (now - lastTap.current < 280) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = 0;
      const r = e.currentTarget.getBoundingClientRect();
      const id = now;
      setHearts((h) => [...h, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
      window.setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 900);
      haptic(12);
      burst({ x: e.clientX, y: e.clientY }, { count: 12, spread: 80 });
      doLike(true);
      return;
    }
    lastTap.current = now;
    if (isVideo) tapTimer.current = window.setTimeout(() => setPaused((p) => !p), 280);
  };

  return (
    <article className="relative h-full w-full overflow-hidden" aria-label={`Reel by ${post.author.displayName}`} onClick={onTap}>
      {/* Media */}
      {isVideo ? (
        <video
          ref={video}
          src={post.mediaUrl!}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          loop
          muted
          preload={near ? "auto" : "metadata"}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (progress.current && v.duration) progress.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
          }}
        />
      ) : post.mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads served from /media
        <img src={post.mediaUrl} alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-transform duration-[9000ms] ease-out", active ? "scale-110" : "scale-100")} />
      ) : (
        <>
          <StatBackdrop seed={post.id} />
          <div className={cn("absolute inset-x-6 top-[22%] transition-all duration-700 ease-[var(--ease-snap)]", active ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
            {post.statValue ? (
              <>
                <p className="kicker text-white/60">{post.statLabel}</p>
                <p className={cn("mt-2 font-bold leading-[0.85] tracking-[-0.05em] text-white", post.statValue.length > 7 ? "text-[64px]" : "text-[min(120px,30vw)]")}>{post.statValue}</p>
              </>
            ) : (
              <p className="line-clamp-6 text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">{post.body}</p>
            )}
          </div>
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-navy via-navy/45 to-transparent" />

      {/* Paused indicator */}
      {isVideo && paused && (
        <span className="animate-scale-in pointer-events-none absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-navy/50 backdrop-blur">
          <Pause size={34} fill="currentColor" />
        </span>
      )}

      {/* Double-tap hearts */}
      {hearts.map((h) => (
        <Heart key={h.id} size={96} fill="#B7F34A" strokeWidth={0} className="animate-heart-burst pointer-events-none absolute text-green drop-shadow-[0_8px_24px_rgba(183,243,74,.5)]" style={{ left: h.x - 48, top: h.y - 48 }} />
      ))}

      {/* Right rail */}
      <div className="absolute bottom-[calc(var(--tabbar-h)+1.5rem)] right-3 z-10 flex flex-col items-center gap-4">
        <div className="relative mb-1">
          <Link href={`/u/${post.author.handle}`} aria-label={post.author.displayName}>
            <Avatar name={post.author.displayName} url={post.author.avatarUrl} size={46} className="ring-2 ring-white" />
          </Link>
          {!following && (
            <button
              type="button"
              aria-label={`Follow ${post.author.displayName}`}
              onClick={(e) => {
                setFollowing(true);
                haptic();
                burst(e.currentTarget, { count: 8, spread: 40 });
                toggleFollow(post.author.id).catch(() => setFollowing(false));
              }}
              className="pressable absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-green text-navy shadow"
            >
              <Plus size={15} strokeWidth={3} />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-pressed={like.liked}
          aria-label={like.liked ? "Unlike" : "Like"}
          onClick={(e) => {
            if (!like.liked) {
              haptic();
              burst(e.currentTarget.firstElementChild, { count: 9, spread: 46 });
            }
            doLike();
          }}
          className="flex flex-col items-center gap-1 text-[11px] font-semibold"
        >
          <span className={cn("glass-dark grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90", like.liked && "text-green")}>
            <Heart key={String(like.liked)} size={21} fill={like.liked ? "currentColor" : "none"} strokeWidth={2.2} className={like.liked ? "animate-heart-pop" : undefined} />
          </span>
          {compact(like.likes)}
        </button>
        <CommentButton postId={post.id} postAuthorId={post.author.id} count={post.comments} viewer={viewer} />
        <ShareButton path={`/p/${post.id}`} title={`${post.author.displayName} on Riadha`} />
      </div>

      {/* Caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-[calc(var(--tabbar-h)+1.25rem)] pr-20">
        <Link href={`/u/${post.author.handle}`} className="inline-flex items-center gap-1.5 text-[16px] font-semibold">
          {post.author.displayName}
          <Tick role={post.author.role} verified={post.author.verified} size={15} />
          <span className="text-[12px] font-normal text-white/55">· {timeAgo(post.createdAt)}</span>
        </Link>
        {post.body && (post.mediaUrl || post.statValue) && (
          <button type="button" onClick={() => setExpanded((x) => !x)} className={cn("mt-1.5 block text-left text-[14px] leading-snug text-white/90", !expanded && "line-clamp-2")}>
            {post.body}
          </button>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.author.sport && <span className="rounded-md bg-white/12 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] backdrop-blur">{post.author.sport}</span>}
          {post.statValue && post.mediaUrl && (
            <span className="rounded-md bg-green px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-navy">
              {post.statLabel} · {post.statValue}
            </span>
          )}
          {post.location && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-1 text-[11px] backdrop-blur">
              <MapPin size={11} /> {post.location}
            </span>
          )}
        </div>
        <button type="button" onClick={() => router.push(`/p/${post.id}`)} className="sr-only">
          Open post
        </button>
      </div>

      {/* Video progress */}
      {isVideo && (
        <span className="absolute inset-x-0 bottom-[var(--tabbar-h)] z-10 h-[2px] bg-white/15">
          <span ref={progress} className="block h-full origin-left scale-x-0 bg-green" />
        </span>
      )}
    </article>
  );
}
