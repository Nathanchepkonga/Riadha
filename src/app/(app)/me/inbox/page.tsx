import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Mail, ShieldCheck } from "lucide-react";
import { markInboxRead } from "@/actions/profile";
import { db } from "@/db";
import { contactRequests, users } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { cn, timeAgo } from "@/lib/format";
import { Tick } from "@/components/ui/tick";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  const user = await requireUser();
  const items = await db
    .select({ r: contactRequests, from: { handle: users.handle, role: users.role, verified: users.verified, displayName: users.displayName } })
    .from(contactRequests)
    .leftJoin(users, eq(users.id, contactRequests.fromUserId))
    .where(eq(contactRequests.athleteId, user.id))
    .orderBy(desc(contactRequests.createdAt));
  if (items.some((i) => !i.r.readAt)) await markInboxRead();

  return (
    <div className="px-4 pt-5">
      <p className="kicker">Collaboration</p>
      <h1 className="h2">Inbox</h1>
      <p className="mt-2 text-sm text-muted">Requests from your portfolio&apos;s contact form. Reply by email; your phone number is never shared.</p>
      <ul className="mt-5 flex flex-col gap-3">
        {items.map(({ r, from }) => (
          <li key={r.id} className={cn("card p-4", !r.readAt && "border-cobalt")}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-semibold">
                {r.firstName} {r.lastName}
                {from && <Tick role={from.role} verified={from.verified} size={15} />}
              </p>
              <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
            </div>
            {from && <p className="text-xs text-muted">@{from.handle} on Riadha</p>}
            <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed">{r.message}</p>
            {r.routedToGuardian && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-navy"><ShieldCheck size={14} /> Also sent to guardian & club</p>
            )}
            <a href={`mailto:${r.email}?subject=${encodeURIComponent("Re: your message on Riadha")}`} className="btn btn-secondary btn-sm btn-block mt-4">
              <Mail size={16} /> Reply to {r.email}
            </a>
          </li>
        ))}
        {items.length === 0 && <li className="card p-6 text-center text-muted">No requests yet. Share your profile link to get discovered.</li>}
      </ul>
    </div>
  );
}
