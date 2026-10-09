"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, House, Plus, Shirt, UserRound } from "lucide-react";
import { cn } from "@/lib/format";

const TABS = [
  { href: "/feed", label: "Home", icon: House, match: (p: string) => p.startsWith("/feed") || p.startsWith("/communities") || p.startsWith("/c/") || p.startsWith("/market") || p.startsWith("/discover") },
  { href: "/watch", label: "Watch", icon: Clapperboard, match: (p: string) => p.startsWith("/watch") },
  { href: "/post/new", label: "Post", icon: Plus, match: (p: string) => p.startsWith("/post"), primary: true },
  { href: "/fantasy", label: "Fantasy", icon: Shirt, match: (p: string) => p.startsWith("/fantasy") || p.startsWith("/fixtures") },
  { href: "/me", label: "Me", icon: UserRound, match: (p: string, handle: string) => p.startsWith("/me") || p.startsWith("/scout") || p === `/u/${handle}` },
];

/**
 * Floating navy dock (UI kit icon bar, brand-kit colours). A glowing green slash slides to the active
 * tab; the centre action is the post button in the mark gradient.
 */
export function TabBar({ handle }: { handle: string }) {
  const path = usePathname();
  const active = TABS.findIndex((t) => t.match(path, handle));

  return (
    <nav
      aria-label="Main"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[calc(var(--dock-gap)+var(--sab))] pl-[calc(0.75rem+var(--sal))] pr-[calc(0.75rem+var(--sar))]"
    >
      <div className="pointer-events-auto relative mx-auto grid h-16 max-w-[456px] grid-cols-5 overflow-hidden rounded-[22px] bg-navy/[.93] shadow-[0_18px_40px_-14px_rgba(8,16,24,.6)] ring-1 ring-white/10 backdrop-blur-xl">
        {/* Sliding active indicator */}
        {active >= 0 && !TABS[active].primary && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/5 transition-transform duration-500 ease-[var(--ease-spring)] motion-reduce:transition-none"
            style={{ transform: `translateX(${active * 100}%)` }}
          >
            <span className="absolute left-1/2 top-0 h-[3px] w-8 -translate-x-1/2 -skew-x-[37.57deg] rounded-b bg-green shadow-[0_0_14px_2px_rgba(183,243,74,.55)]" />
            <span className="absolute inset-x-2 top-0 h-10 rounded-b-full bg-[radial-gradient(closest-side,rgba(183,243,74,.18),transparent)]" />
          </span>
        )}
        {TABS.map(({ href, label, icon: Icon, primary }, i) => {
          const on = i === active;
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              className={cn(
                "pressable relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold tracking-wide transition-colors",
                on ? "text-white" : "text-white/55 hover:text-white/85",
              )}
            >
              {primary ? (
                <span className="relative grid h-11 w-14 place-items-center text-navy">
                  <span aria-hidden className="absolute inset-0 -skew-x-[14deg] rounded-xl bg-[linear-gradient(135deg,#8DD63A,#B7F34A)] shadow-[0_6px_20px_-4px_rgba(183,243,74,.6)]" />
                  <Icon size={24} strokeWidth={2.6} className="relative" />
                </span>
              ) : (
                <>
                  <Icon size={22} strokeWidth={on ? 2.4 : 2} className={cn("transition-transform duration-500 ease-[var(--ease-spring)]", on && "-translate-y-0.5 scale-110 text-green")} />
                  {label}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
