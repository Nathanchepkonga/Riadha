"use client";

import { useEffect, useRef, useState } from "react";

/** Scoreboard count-up: cubic ease-out, starts when scrolled into view. */
export function CountUp({
  to,
  delay = 0,
  duration = 2200,
  grouped = true,
  className,
}: {
  to: number;
  delay?: number;
  duration?: number;
  /** Thousands separators (12,408) or plain digits (12408). */
  grouped?: boolean;
  className?: string;
}) {
  const format = (n: number) => (grouped ? n.toLocaleString("en-KE") : String(n));
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    // Reset to 0 only inside the first frame: if frames never run (hidden tab), the real number stays.
    const run = () => {
      raf = requestAnimationFrame((t0) => {
        const start = t0 + delay;
        const tick = (t: number) => {
          const p = Math.min(1, Math.max(0, (t - start) / duration));
          setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        tick(t0);
      });
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, delay, duration]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
