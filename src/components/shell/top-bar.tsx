import Link from "next/link";
import { ChevronLeft, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MenuButton, type MenuUser } from "./menu";

/** App bar (UI kit pattern): logo left, search + menu right. `back` swaps the logo for a back link. */
export function TopBar({ user, back }: { user: MenuUser; back?: { href: string; label: string } }) {
  return (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-offwhite/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[480px] items-center justify-between px-4">
        {back ? (
          <Link href={back.href} className="-ml-1 inline-flex items-center gap-1 text-[15px] font-semibold">
            <ChevronLeft size={20} /> {back.label}
          </Link>
        ) : (
          <Link href={user ? "/feed" : "/"} aria-label="Riadha home">
            <Logo variant="compact" size={24} />
          </Link>
        )}
        <div className="flex items-center gap-1">
          <Link href="/discover" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-gray-200">
            <Search size={20} strokeWidth={2.2} />
          </Link>
          <MenuButton user={user} />
        </div>
      </div>
    </header>
  );
}
