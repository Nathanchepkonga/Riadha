import type { Metadata, Viewport } from "next";
import { requireUser } from "@/lib/auth/session";
import { getWatchPage } from "@/lib/watch";
import { WatchFeed } from "@/components/watch/watch-feed";

export const metadata: Metadata = { title: "Watch" };
export const viewport: Viewport = { themeColor: "#081018" };

export default async function WatchPage({ searchParams }: PageProps<"/watch">) {
  const user = await requireUser();
  const tab = (await searchParams).tab === "following" ? "following" : "forYou";
  const initial = await getWatchPage(user, tab);
  // Keyed by tab so switching feeds starts from the top with fresh state.
  return <WatchFeed key={tab} initial={initial} tab={tab} viewer={{ id: user.id, isAdmin: user.isAdmin }} />;
}
