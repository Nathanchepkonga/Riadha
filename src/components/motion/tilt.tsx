"use client";

import { useRef } from "react";
import { cn } from "@/lib/format";

/**
 * 3D tilt with a soft glare that follows the pointer (mouse and pen only; touch scrolling is never
 * hijacked). Purely presentational: children keep their own links and buttons.
 */
export function Tilt({ children, className, max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.dataset.tilting = "";
      el.style.setProperty("--ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    delete el.dataset.tilting;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("tilt relative", className)}>
      {children}
      <span className="tilt-glare" aria-hidden />
    </div>
  );
}
