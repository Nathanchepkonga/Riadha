import { getCurrentUser } from "@/lib/auth/session";
import { unreadTotal } from "@/lib/fantasy/chat";

/** Unread league-chat messages (muted chats excluded), for the badge on the Fantasy tab. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ total: 0 });
  return Response.json({ total: await unreadTotal(user.id) }, { headers: { "Cache-Control": "no-store" } });
}
