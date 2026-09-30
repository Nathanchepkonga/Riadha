"use client";

import { useEffect, useRef, useState } from "react";

const W = 390;
const H = 844;

/** iPhone-style frame. Children are laid out at 390×844 and scaled to fit the frame. */
export function PhoneMockup({ children, className }: { children: React.ReactNode; className?: string }) {
  const screen = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);

  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={className}>
      <div className="phone-frame relative rounded-[clamp(30px,4vw,54px)] bg-black p-[clamp(6px,1vw,12px)] shadow-2xl shadow-black/60">
        <div className="pointer-events-none absolute inset-0 rounded-[clamp(30px,4vw,54px)] ring-1 ring-white/15" />
        {/* side buttons */}
        <span className="absolute -left-[3px] top-[19%] h-[4.5%] w-[3px] rounded-l bg-neutral-700" />
        <span className="absolute -left-[3px] top-[26%] h-[7.3%] w-[3px] rounded-l bg-neutral-700" />
        <span className="absolute -left-[3px] top-[35.5%] h-[7.3%] w-[3px] rounded-l bg-neutral-700" />
        <span className="absolute -right-[3px] top-[30.8%] h-[11.4%] w-[3px] rounded-r bg-neutral-700" />
        <div ref={screen} className="relative h-full w-full overflow-hidden rounded-[clamp(24px,3.2vw,44px)] bg-navy">
          <div className="absolute left-1/2 top-[1.6%] z-50 h-[3.6%] w-[30%] -translate-x-1/2 rounded-full bg-black" />
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
