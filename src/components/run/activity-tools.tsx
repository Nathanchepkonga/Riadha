"use client";

import { useActionState, useEffect } from "react";
import { updateActivity } from "@/actions/running";
import { FormMessage, SubmitButton } from "@/components/ui/forms";
import { celebrate } from "@/lib/celebrate";

/** Fires the confetti once when a just-saved run set PRs or finished challenges. */
export function NewRunCelebration({ wins }: { wins: number }) {
  useEffect(() => {
    if (wins > 0) celebrate();
  }, [wins]);
  return null;
}

export function ActivityEditor({ id, title, isPrivate }: { id: number; title: string; isPrivate: boolean }) {
  const [state, action] = useActionState(updateActivity.bind(null, id), undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <label>
        <span className="label">Title</span>
        <input name="title" defaultValue={title} required minLength={2} maxLength={80} className="field" />
      </label>
      <label className="flex items-start gap-3 rounded-xl border border-line px-3 py-2.5 text-[14px]">
        <input type="checkbox" name="isPrivate" defaultChecked={isPrivate} className="mt-0.5 h-4 w-4 accent-[#081018]" />
        <span>
          <span className="block font-semibold">Only me</span>
          <span className="text-[12px] text-muted">Removes the post from the feed. Still counts for your leagues and challenges.</span>
        </span>
      </label>
      <FormMessage state={state} />
      <SubmitButton className="btn-secondary">Save changes</SubmitButton>
    </form>
  );
}
