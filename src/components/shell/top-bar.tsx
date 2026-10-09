import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AutoHideHeader } from "./auto-hide";
import { MenuButton, type MenuUser } from "./menu";

/** App bar (UI kit pattern): logo left, search + menu right. Frosted, slides away while scrolling down. */
export function TopBar({ user, back }: { user: MenuUser; back?: { href: string; label: string } }) {
  return (
    <AutoHideHeader className="safe-top border-b border-line/70 bg-offwhite/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
        {back ? (
          <Link href={back.href} className="pressable -ml-1 inline-flex items-center gap-1 text-[15px] font-semibold">
            <ChevronLeft size={20} /> {back.label}
          </Link>
        ) : (
          <Link href={user ? "/feed" : "/"} aria-label="Riadha home" className="pressable">
            <Logo variant="compact" size={24} />
          </Link>
        )}
        <div className="flex items-center gap-1">
          <Link href="/discover" aria-label="Search" className="pressable grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-gray-200">
            <Search size={20} strokeWidth={2.2} />
          </Link>
          <MenuButton user={user} />
        </div>
      </div>
      {/* hairline glow along the bottom edge */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,rgba(141,214,58,.55),rgba(56,103,255,.45),transparent)] opacity-0 transition-opacity duration-500 group-data-[raised]/header:opacity-100" />
    </AutoHideHeader>
  );
}
