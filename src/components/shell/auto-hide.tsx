"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

/** A sticky header that slides away while scrolling down and returns on the first scroll up. */
export function AutoHideHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const [hidden, setHidden] = useState(false);
  const [raised, setRaised] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last.current;
      setRaised(y > 4);
      // Ignore small jitters and iOS overscroll bounce.
      if (Math.abs(dy) < 6) return;
      setHidden(dy > 0 && y > 96);
      last.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-hidden={hidden || undefined}
      data-raised={raised || undefined}
      className={cn(
        "group/header sticky top-0 z-30 transition-[transform,box-shadow] duration-500 ease-[var(--ease-snap)] data-[hidden]:-translate-y-full data-[raised]:shadow-[0_10px_30px_-18px_rgba(8,16,24,.35)] motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </header>
  );
}
