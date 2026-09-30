"use client";

import { Children, useRef, useState } from "react";
import { cn } from "@/lib/format";

/** Scroll-snap carousel with pager dots (the kit's hero news carousel). */
export function Carousel({ children, label }: { children: React.ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = Children.count(children);

  return (
    <section aria-roledescription="carousel" aria-label={label}>
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {Children.map(children, (child, i) => (
          <div className="w-full shrink-0 snap-center px-0.5" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}>
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: "smooth" })}
              className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-navy" : "w-1.5 bg-gray-400")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
