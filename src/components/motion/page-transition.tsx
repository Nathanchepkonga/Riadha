"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/**
 * Animates between screens: the old screen lifts away and the new one rises in (CSS `.page` classes in
 * globals.css). Keyed by pathname so only real navigations animate; in-page updates (likes, follows,
 * search params) never trigger it. Browsers without View Transitions just swap instantly.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page" exit="page" update="none" default="none">
      {children}
    </ViewTransition>
  );
}
