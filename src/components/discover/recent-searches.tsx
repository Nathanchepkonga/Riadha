"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock3, X } from "lucide-react";

const KEY = "riadha-recent-searches";

export function RecentSearches({ query }: { query: string }) {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
        const current = Array.isArray(saved) ? saved.filter((v): v is string => typeof v === "string").slice(0, 6) : [];
        if (query) {
          const next = [query, ...current.filter((v) => v.toLowerCase() !== query.toLowerCase())].slice(0, 6);
          localStorage.setItem(KEY, JSON.stringify(next));
          setItems(next);
        } else {
          setItems(current);
        }
      } catch {
        localStorage.removeItem(KEY);
      }
    });
    return () => window.clearTimeout(timer);
  }, [query]);

  if (!items.length || query) return null;
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="kicker flex items-center gap-1.5"><Clock3 size={13} /> Recent searches</h2>
        <button type="button" onClick={() => { localStorage.removeItem(KEY); setItems([]); }} className="text-xs font-semibold text-muted hover:text-ink">Clear</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => <Link key={item} href={`/discover?q=${encodeURIComponent(item)}`} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium hover:bg-gray-200"><X size={12} className="rotate-45 text-muted" />{item}</Link>)}
      </div>
    </section>
  );
}
