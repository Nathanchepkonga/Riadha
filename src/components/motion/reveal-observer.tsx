"use client";

import { useEffect } from "react";

const SELECTOR = "[data-reveal]";

/**
 * One IntersectionObserver for the whole app. Any element with `data-reveal` gets `.is-in` the first
 * time it scrolls into view (CSS in globals.css does the animation). Children of a `[data-stagger]`
 * parent get increasing delays. New elements (route changes, infinite lists) are picked up through a
 * MutationObserver, so pages don't need to do anything beyond adding the attribute.
 */
export function RevealObserver() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();

    const show = (el: Element) => el.classList.add("is-in");
    const io = reduced
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              show(e.target);
              io!.unobserve(e.target);
            }
          },
          { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
        );

    const register = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      const parent = el.parentElement?.closest("[data-stagger]");
      if (parent && el instanceof HTMLElement && !el.style.getPropertyValue("--reveal-delay")) {
        const siblings = [...parent.querySelectorAll(SELECTOR)].filter((s) => s.parentElement?.closest("[data-stagger]") === parent);
        const step = Number((parent as HTMLElement).dataset.stagger) || 70;
        el.style.setProperty("--reveal-delay", `${Math.min(siblings.indexOf(el), 10) * step}ms`);
      }
      if (!io) return show(el);
      // Already on screen (above the fold, or a fresh route): reveal on the next frame without waiting
      // for the observer's first callback.
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0 && r.width > 0) requestAnimationFrame(() => requestAnimationFrame(() => show(el)));
      else io.observe(el);
    };

    const scan = (root: ParentNode) => {
      if (root instanceof Element && root.matches(SELECTOR)) register(root);
      root.querySelectorAll(SELECTOR).forEach(register);
    };
    scan(document);

    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof Element && scan(n));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Failsafe: anything still hidden after a while (e.g. inside a scroller the observer can't see) shows.
    const t = window.setTimeout(() => document.querySelectorAll(`${SELECTOR}:not(.is-in)`).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) show(el);
    }), 2500);

    return () => {
      io?.disconnect();
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, []);
  return null;
}
