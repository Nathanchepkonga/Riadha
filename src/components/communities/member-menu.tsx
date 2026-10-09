"use client";

import { useTransition } from "react";
import { removeMember, setMemberRole } from "@/actions/communities";

/** Owner/admin controls on a member row: promote, demote, hand over ownership, remove. */
export function MemberMenu({ communityId, userId, role, viewerRole }: { communityId: number; userId: string; role: "owner" | "admin" | "member"; viewerRole: "owner" | "admin" | "site" }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      await fn().catch((e: Error) => window.alert(e.message));
    });
  };
  const owner = viewerRole === "owner" || viewerRole === "site";
  if (role === "owner") return null;
  return (
    <div className="flex shrink-0 gap-1">
      {owner && role === "member" && (
        <button type="button" disabled={pending} onClick={() => run(() => setMemberRole(communityId, userId, "admin"))} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold hover:bg-gray-200">
          Make admin
        </button>
      )}
      {owner && role === "admin" && (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => setMemberRole(communityId, userId, "member"))} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold hover:bg-gray-200">
            Demote
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setMemberRole(communityId, userId, "owner"), "Hand over ownership? You'll become an admin.")} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold hover:bg-gray-200">
            Make owner
          </button>
        </>
      )}
      {(owner || role === "member") && (
        <button type="button" disabled={pending} onClick={() => run(() => removeMember(communityId, userId), "Remove this member from the community?")} className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10">
          Remove
        </button>
      )}
    </div>
  );
}
