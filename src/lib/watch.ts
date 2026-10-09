import "server-only";
import type { User } from "@/db/schema";
import { getAdsFor, type ServedAd } from "@/lib/ads";
import { getPosts, type FeedPost } from "@/lib/queries";

export const WATCH_PAGE = 8;

export type WatchPage = { posts: FeedPost[]; ads: ServedAd[]; nextOffset: number | null };

/** One page of the vertical reel feed: posts with media or a stat, plus sponsored reels to interleave. */
export async function getWatchPage(viewer: User, tab: "forYou" | "following", offset = 0): Promise<WatchPage> {
  const [posts, ads] = await Promise.all([
    getPosts({ viewerId: viewer.id, mode: tab === "following" ? "following" : "watch", mediaOnly: true, limit: WATCH_PAGE, offset }),
    getAdsFor(viewer, 2),
  ]);
  return { posts, ads, nextOffset: posts.length === WATCH_PAGE ? offset + WATCH_PAGE : null };
}
