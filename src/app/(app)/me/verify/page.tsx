import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { verificationRequests } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { Tick, tickLabel } from "@/components/ui/tick";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verification" };

export default async function VerifyPage() {
  const user = await requireUser();
  const history = await db.select().from(verificationRequests).where(eq(verificationRequests.userId, user.id)).orderBy(desc(verificationRequests.createdAt));
  const pending = history.find((h) => h.status === "pending");

  return (
    <div className="px-4 pt-5">
      <p className="kicker">Trust & safety</p>
      <h1 className="h2">Verification</h1>
      <p className="mt-3 text-muted">The tick colour tells everyone who they&apos;re talking to. It matters most where scouts and young athletes meet.</p>

      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
        {(["athlete", "club", "scout"] as const).map((r) => (
          <div key={r} className="card flex flex-col items-center gap-1.5 p-3">
            <Tick role={r} verified size={26} />
            <span className="font-semibold">{tickLabel(r).replace("Verified ", "")}</span>
          </div>
        ))}
      </div>

      {user.verified ? (
        <div className="card mt-6 flex items-center gap-3 p-4">
          <Tick role={user.role} verified size={28} />
          <p><b>You&apos;re verified</b> as a {user.role}.</p>
        </div>
      ) : pending ? (
        <div className="card mt-6 p-4">
          <p className="font-semibold">In review</p>
          <p className="mt-1 text-sm text-muted">Sent {formatDate(pending.createdAt)} as {pending.type}. We usually reply within 48 hours.</p>
          <ol className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px]">
            {["Submitted", "Reviewing", "Tick"].map((s, i) => (
              <li key={s} className={i < 2 ? "rounded-lg bg-green py-2 text-navy" : "rounded-lg bg-gray-100 py-2 text-muted"}>{s}</li>
            ))}
          </ol>
        </div>
      ) : (
        <VerifyForm defaultType={user.role === "fan" ? "athlete" : user.role} legalName={user.displayName} />
      )}

      {history.filter((h) => h.status === "rejected").slice(0, 1).map((h) => (
        <p key={h.id} className="mt-4 rounded-lg border-l-4 border-danger bg-danger/8 px-4 py-3 text-sm">
          Last request not approved{h.adminNote ? `: ${h.adminNote}` : "."}
        </p>
      ))}

      <p className="mt-8 text-xs leading-relaxed text-muted">
        We only use your documents to verify you and delete ID images once a decision is made, in line with Kenya&apos;s Data Protection Act.
        Automated ID and selfie checks (Smile ID) are coming soon.
      </p>
    </div>
  );
}
