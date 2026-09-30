"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/brand/logo";
import { SlashStripes } from "@/components/brand/graphics";
import { Portal, useModal } from "@/components/ui/overlay";
import { cn } from "@/lib/format";

export type MenuUser = { handle: string; isAdmin: boolean } | null;

type NavLink = { href: string; label: string };

function linksFor(user: MenuUser): NavLink[] {
  if (!user) {
    return [
      { href: "/", label: "Home" },
      { href: "/discover", label: "Discover athletes" },
      { href: "/login", label: "Play fantasy" },
    ];
  }
  return [
    { href: "/feed", label: "Feed" },
    { href: "/fantasy", label: "Fantasy" },
    { href: "/fantasy/leagues", label: "Leagues" },
    { href: "/fixtures", label: "Fixtures" },
    { href: "/discover", label: "Discover" },
    { href: `/u/${user.handle}`, label: "My profile" },
    { href: "/post/new", label: "Post a highlight" },
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
          "flex h-10 w-10 flex-col items-end justify-center gap-[5px] rounded-full pr-[10px] transition-colors",
          tone === "ink" ? "hover:bg-gray-200" : "hover:bg-white/10",
          className,
        )}
      >
        <i className={cn("block h-[2px] w-[19px] rounded-full", bar)} />
        <i className={cn("block h-[2px] w-[9px] rounded-full", bar)} />
      </button>
      {open && <MenuOverlay id={menuId} user={user} pathname={pathname} onClose={() => setOpen(false)} />}
    </>
  );
}

function MenuOverlay({ id, user, pathname, onClose }: { id: string; user: MenuUser; pathname: string; onClose: () => void }) {
  const dialog = useRef<HTMLDivElement>(null);
  useModal(dialog, onClose);
  const links = linksFor(user);
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href);

  return (
    <Portal>
      <div
        ref={dialog}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="animate-fade-in fixed inset-0 z-[60] flex flex-col overflow-y-auto overscroll-contain bg-navy pb-[calc(2rem+var(--sab))] pl-[calc(1.5rem+var(--sal))] pr-[calc(1.5rem+var(--sar))] pt-[calc(1.5rem+var(--sat))]"
      >
        <div className="pointer-events-none absolute inset-0 bg-navy" aria-hidden>
          <SlashStripes className="absolute -bottom-2 -left-2 w-56 opacity-90" />
        </div>
        <div className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col">
          <div className="flex items-center justify-between">
            <Logo variant="compact" theme="dark" size={26} />
            <button type="button" aria-label="Close menu" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20">
              <X size={22} />
            </button>
          </div>
          <nav aria-label="Main" className="mt-14 flex flex-col gap-4">
            {links.map((l, i) => {
              const current = isCurrent(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  // Same-page links don't change the route, so close explicitly.
                  onClick={onClose}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "animate-fade-slide-right self-start text-[32px] font-bold leading-none tracking-[-0.03em] transition-colors hover:text-green",
                    current ? "text-green" : "text-white",
                  )}
                  style={{ animationDelay: `${100 + i * 80}ms` }}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-10">
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
    </Portal>
  );
}
