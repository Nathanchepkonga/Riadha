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
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.onboarded) redirect("/feed");
  const clubs = await db.select({ id: kplClubs.id, name: kplClubs.name }).from(kplClubs).orderBy(asc(kplClubs.name));

  return (
    <main className="mx-auto max-w-[480px] px-6 pb-[calc(4rem+var(--sab))] pt-[calc(1.5rem+var(--sat))]">
      <Logo variant="compact" size={26} />
      <p className="kicker mt-10">Step 1 of 1</p>
      <h1 className="h1 mt-2">Karibu Riadha</h1>
      <p className="mt-3 text-muted">Tell us who you are. You can change all of this later.</p>
      <div className="mt-8">
        <OnboardingForm clubs={clubs} defaultName={user.displayName} next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
