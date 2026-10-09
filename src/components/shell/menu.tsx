"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { logout } from "@/actions/auth";
import { Logo, Tagline } from "@/components/brand/logo";
import { Aurora, ChevronLines } from "@/components/brand/graphics";
import { Portal, useModal } from "@/components/ui/overlay";
import { cn } from "@/lib/format";

export type MenuUser = { handle: string; isAdmin: boolean; canScout?: boolean } | null;

type NavLink = { href: string; label: string; hint?: string };

function linksFor(user: MenuUser): NavLink[] {
  if (!user) {
    return [
      { href: "/", label: "Home" },
      { href: "/discover", label: "Discover athletes" },
      { href: "/login", label: "Play fantasy" },
    ];
  }
  return [
    { href: "/feed", label: "Home", hint: "Feed" },
    { href: "/watch", label: "Watch", hint: "Reels" },
    { href: "/fantasy", label: "Fantasy", hint: "KPL" },
    { href: "/fixtures", label: "Fixtures" },
    { href: "/communities", label: "Communities", hint: "Clubs & crews" },
    { href: "/market", label: "Marketplace", hint: "Gyms, kit, physios" },
    ...(user.canScout ? [{ href: "/scout", label: "Scout portal", hint: "Find talent" }] : []),
    { href: "/discover", label: "Discover" },
    { href: `/u/${user.handle}`, label: "My profile" },
    ...(user.isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
}

/** The two-bar menu button. The full-screen menu is portalled to <body> and only mounted while open. */
export function MenuButton({ user, className, tone = "ink" }: { user: MenuUser; className?: string; tone?: "ink" | "light" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const menuId = useId();

  // Close when the route changes underneath the menu (browser back/forward, redirects).
  if (pathname !== openedOn) {
    setOpenedOn(pathname);
    if (open) setOpen(false);
  }

  const bar = tone === "ink" ? "bg-navy" : "bg-white";
  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen(true)}
        className={cn(
          "pressable group flex h-10 w-10 flex-col items-end justify-center gap-[5px] rounded-full pr-[10px] transition-colors",
          tone === "ink" ? "hover:bg-gray-200" : "hover:bg-white/10",
          className,
        )}
      >
        <i className={cn("block h-[2px] w-[19px] rounded-full transition-[width] duration-300", bar)} />
        <i className={cn("block h-[2px] w-[9px] rounded-full transition-[width] duration-300 group-hover:w-[19px]", bar)} />
      </button>
      {open && <MenuOverlay id={menuId} user={user} pathname={pathname} onClose={() => setOpen(false)} />}
    </>
  );
}

function MenuOverlay({ id, user, pathname, onClose }: { id: string; user: MenuUser; pathname: string; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog, onClose);
  const links = linksFor(user);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href || (href !== "/feed" && pathname.startsWith(`${href}/`)));

  return (
    <Portal>
      <div
        ref={dialog}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="menu-overlay animate-fade-in fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-navy pb-[calc(1.5rem+var(--sab))] pl-[calc(1.5rem+var(--sal))] pr-[calc(1.5rem+var(--sar))] pt-[calc(1.25rem+var(--sat))] text-white"
      >
        <div className="pointer-events-none fixed inset-0" aria-hidden>
          <Aurora intensity={0.9} />
          <ChevronLines className="animate-fade-slide-left ad-300 absolute -right-24 top-1/4 h-[60vh] w-auto opacity-70" count={8} />
        </div>
        <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Logo variant="compact" theme="dark" size={24} animated />
            <button type="button" aria-label="Close menu" onClick={onClose} className="pressable grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-transform duration-500 hover:rotate-90 hover:bg-white/20">
              <X size={22} />
            </button>
          </div>
          <nav aria-label="Main" className="mt-10 flex flex-col">
            {links.map((l, i) => {
              const current = isCurrent(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  // Same-page links don't change the route, so close explicitly.
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  className="animate-fade-slide-right group flex items-baseline gap-4 border-b border-white/[.07] py-2.5"
                  style={{ animationDelay: `${80 + i * 45}ms` }}
                >
                  <span className={cn("w-6 text-[11px] font-semibold tabular tracking-[0.14em]", current ? "text-green" : "text-white/35")}>{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={cn(
                      "text-[clamp(24px,7.4vw,30px)] font-bold leading-[1.1] tracking-[-0.03em] transition-[color,transform] duration-300 group-hover:translate-x-1.5",
                      current ? "text-mark" : "text-white group-hover:text-green",
                    )}
                  >
                    {l.label}
                  </span>
                  {l.hint && <span className="ml-auto hidden text-[12px] text-white/40 min-[380px]:inline">{l.hint}</span>}
                  <ArrowUpRight size={16} className="ml-auto shrink-0 self-center text-white/30 opacity-0 transition-opacity group-hover:opacity-100 min-[380px]:ml-0" />
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-8">
            <Tagline light className="block text-center text-[10px] text-white/70" />
            <div className="mt-5">
              {user ? (
                <form action={logout}>
                  <button type="submit" className="btn btn-light btn-block">Sign out</button>
                </form>
              ) : (
                <Link href="/login" onClick={onClose} className="btn btn-accent btn-block">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
