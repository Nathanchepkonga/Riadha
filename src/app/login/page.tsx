import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo, Slogan } from "@/components/brand/logo";
import { Aurora, SpeedStripes } from "@/components/brand/graphics";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
// Sign-in opens on the navy brand hero.
export const viewport: Viewport = { themeColor: "#081018" };

/** Welcome screen (UI kit pattern): brand hero on top, sign-in sheet below. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(user.onboarded ? "/feed" : "/onboarding");

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-navy">
      <section className="relative flex min-h-[46dvh] flex-col items-center justify-center overflow-hidden px-6 pb-12 pt-[calc(2.5rem+var(--sat))] text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- brand photography from design/brand */}
        <img src="/brand/stadium-track.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/40 via-navy/70 to-navy" />
        <Aurora intensity={0.8} />
        <SpeedStripes animated fade className="absolute -bottom-1 -left-2 w-56 opacity-90" />
        <Link href="/" aria-label="Riadha home" className="relative">
          <Logo variant="stacked" theme="dark" size={46} animated />
        </Link>
        <Slogan light className="relative mt-6 text-[15px] animate-fade-slide-up ad-900" />
      </section>

      <section className="relative -mt-6 flex-1 rounded-t-[28px] bg-offwhite px-6 pb-[calc(2.5rem+var(--sab))] pt-8 animate-fade-slide-up ad-300">
        <h1 className="h3">Welcome to Riadha</h1>
        <p className="mt-1.5 text-[14px] text-muted">Sign in or create an account with your phone number. No password needed.</p>
        <div className="mt-6">
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </section>
    </main>
  );
}
