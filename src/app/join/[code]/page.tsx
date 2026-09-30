import Link from "next/link";
import { redirect } from "next/navigation";
import { joinByCode } from "@/actions/fantasy";
import { getCurrentUser } from "@/lib/auth/session";

// Invite links from WhatsApp land here: /join/OFFICE7
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/join/${encodeURIComponent(code)}`);
  if (!user.onboarded) redirect("/onboarding");
  const res = await joinByCode(code);
  return (
    <main className="mx-auto max-w-[480px] px-6 pb-6 pt-[calc(1.5rem+var(--sat))] text-center">
      <p className="h4">Hmm</p>
      <p className="mt-2 text-muted">{res.error}</p>
      <Link href="/fantasy/leagues" className="btn btn-primary mt-5">Go to leagues</Link>
    </main>
  );
}
