"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { reportPost } from "@/actions/moderation";
import { Sheet } from "@/components/ui/overlay";
import { REPORT_REASONS } from "@/lib/constants";
import { cn } from "@/lib/format";

/** "Report" with a reason picker. `variant="rail"` is the round button for Watch; `"text"` for post pages. */
export function ReportButton({ postId, variant = "text" }: { postId: number; variant?: "rail" | "text" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ error?: string; ok?: string } | null>(null);
  const [pending, start] = useTransition();

  const trigger =
    variant === "rail" ? (
      <button type="button" onClick={() => setOpen(true)} aria-label="Report" className="flex flex-col items-center gap-1 text-[11px] font-semibold text-white">
        <span className="glass-dark grid h-11 w-11 place-items-center rounded-full">
          <Flag size={18} strokeWidth={2.2} />
        </span>
        Report
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
        <Flag size={14} /> Report
      </button>
    );

  return (
    <>
      {trigger}
      {open && (
        <Sheet
          title="Report this post"
          onClose={() => {
            setOpen(false);
            setResult(null);
          }}
        >
          {result?.ok ? (
            <p className="rounded-lg border-l-4 border-green bg-green/20 px-4 py-3 text-sm">{result.ok}</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => setResult(await reportPost({ postId, reason, note }).catch(() => ({ error: "Couldn't send the report." }))));
              }}
              className="flex flex-col gap-3"
            >
              <p className="text-[13px] text-muted">Reports are anonymous. Posts with several reports are hidden until our team reviews them.</p>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="sr-only">Reason</legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[14px] font-medium", reason === r.value ? "border-navy bg-gray-100" : "border-line")}>
                    <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="h-4 w-4 accent-[#081018]" />
                    {r.label}
                  </label>
                ))}
              </fieldset>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Anything else we should know? (optional)" className="field min-h-20" aria-label="Details" />
              {result?.error && <p role="alert" className="text-[13px] text-danger">{result.error}</p>}
              <button type="submit" disabled={!reason || pending} className="btn btn-primary btn-block">
                {pending ? "Sending…" : "Send report"}
              </button>
            </form>
          )}
        </Sheet>
      )}
    </>
  );
}
