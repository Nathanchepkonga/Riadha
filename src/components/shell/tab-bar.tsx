"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Plus, Shirt, UserRound } from "lucide-react";
import { cn } from "@/lib/format";

/** Bottom navigation (UI kit pattern: icon bar, active item in the primary colour) with a centre post action. */
export function TabBar({ handle }: { handle: string }) {
  const path = usePathname();
  const tabs = [
    { href: "/feed", label: "Home", icon: House, match: (p: string) => p.startsWith("/feed") },
    { href: "/fantasy", label: "Fantasy", icon: Shirt, match: (p: string) => p === "/fantasy" || p.startsWith("/fantasy/squad") || p.startsWith("/fantasy/points") || p.startsWith("/fantasy/leagues") },
    { href: "/post/new", label: "Post", icon: Plus, match: (p: string) => p.startsWith("/post"), primary: true },
    { href: "/fixtures", label: "Fixtures", icon: CalendarDays, match: (p: string) => p.startsWith("/fixtures") || p.startsWith("/fantasy/table") },
    { href: "/me", label: "Me", icon: UserRound, match: (p: string) => p.startsWith("/me") || p === `/u/${handle}` },
  ];
  return (
    <nav className="safe-bottom safe-x fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl" aria-label="Main">
      <div className="mx-auto grid h-16 max-w-[480px] grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, match, primary }) => {
          const on = match(path);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              className={cn("relative flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors", on ? "text-ink" : "text-subtle hover:text-muted")}
            >
              {primary ? (
                <span className="relative grid h-10 w-12 place-items-center text-navy">
                  <span className="absolute inset-0 -skew-x-[14deg] rounded-md bg-green" aria-hidden />
                  <Icon size={22} strokeWidth={2.6} className="relative" />
                </span>
              ) : (
                <>
                  <Icon size={22} strokeWidth={on ? 2.5 : 2} />
                  {label}
                  {on && <span className="absolute top-0 h-[3px] w-8 -skew-x-[14deg] rounded-b bg-green" aria-hidden />}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
