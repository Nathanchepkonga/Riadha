"use client";

import { useTransition } from "react";
import { cn } from "@/lib/format";

/** Runs a (bound) server action after a native confirm. For destructive one-offs like deleting. */
export function ConfirmButton({ action, confirm, children, className }: { action: () => Promise<unknown>; confirm: string; children: React.ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        start(async () => {
          await action().catch((e: Error) => {
            // redirect() inside the action surfaces as a thrown navigation; let Next handle it.
            if (!String(e?.message ?? "").includes("NEXT_REDIRECT")) window.alert(e.message);
          });
        });
      }}
      className={cn(className, pending && "opacity-60")}
    >
      {children}
    </button>
  );
}
