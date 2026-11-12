import type { Metadata } from "next";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { markNotificationsRead } from "@/actions/notifications";
import { requireUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/notifications";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/ui/nav";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(user.id);
  if (items.some((item) => !item.readAt)) await markNotificationsRead();

  return (
    <div className="px-4 pt-5">
      <p className="kicker">Stay in the loop</p>
      <h1 className="h2">Notifications</h1>
      <p className="mt-2 text-sm text-muted">Your follows, comments, opportunities and important Riadha reminders in one place.</p>
      <ul className="mt-5 flex flex-col gap-2">
        {items.map((item) => {
          const content = (
            <>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-green"><Bell size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{item.title}</span>
                {item.body && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{item.body}</span>}
                <span className="mt-1 block text-[11px] text-subtle">{timeAgo(item.createdAt)}</span>
              </span>
              {item.href && <ChevronRight size={17} className="shrink-0 text-subtle" />}
            </>
          );
          return (
            <li key={item.id}>
              {item.href ? <Link href={item.href} className="pressable card flex items-center gap-3 p-3">{content}</Link> : <div className="card flex items-center gap-3 p-3">{content}</div>}
            </li>
          );
        })}
        {items.length === 0 && <li><EmptyState icon={<Bell size={20} />} title="You are all caught up" body="Follow athletes, join communities and take part to see activity here." action={<Link href="/discover" className="btn btn-accent">Discover people</Link>} /></li>}
      </ul>
    </div>
  );
}
