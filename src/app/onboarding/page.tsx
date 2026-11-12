import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { kplClubs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/brand/logo";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const { next, intent } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/feed");
  const clubs = await db.select({ id: kplClubs.id, name: kplClubs.name }).from(kplClubs).orderBy(asc(kplClubs.name));

  return (
    <main className="mx-auto max-w-[480px] px-6 pb-[calc(4rem+var(--sab))] pt-[calc(1.5rem+var(--sat))]">
      <Logo variant="compact" size={26} />
      <p className="kicker mt-10">Make Riadha yours</p>
      <h1 className="h1 mt-2">Karibu Riadha</h1>
      <p className="mt-3 max-w-[38ch] text-muted">Choose the path that fits you best. We&apos;ll shape your first home screen around it, and you can change everything later.</p>
      <div className="mt-8">
        <OnboardingForm
          clubs={clubs}
          defaultName={user.displayName}
          defaultRole={intent === "athlete" || intent === "club" || intent === "scout" ? intent : "fan"}
          next={typeof next === "string" ? next : undefined}
        />
      </div>
    </main>
  );
}
