/*
 * Small celebrations in brand colours: slanted "speed shards" (the mark's diagonal) that burst from a
 * point. Client-only, dependency-free (Web Animations API), and silent under reduced motion.
 */

const COLORS = ["#B7F34A", "#8DD63A", "#3867FF", "#FFFFFF"];

function reducedMotion() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A short haptic tick where supported (Android). */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
}

function origin(from?: Element | { x: number; y: number } | null) {
  if (!from) return { x: window.innerWidth / 2, y: window.innerHeight * 0.4 };
  if ("x" in from && "y" in from && !(from instanceof Element)) return from;
  const r = (from as Element).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Shards burst out of `from` (an element or a point). `count` 6–10 suits a like; 40+ a big moment. */
export function burst(from?: Element | { x: number; y: number } | null, { count = 10, spread = 70, colors = COLORS }: { count?: number; spread?: number; colors?: string[] } = {}) {
  if (reducedMotion()) return;
  const { x, y } = origin(from);
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  let done = 0;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "shard";
    const w = 4 + Math.random() * 4;
    const h = w * (1.8 + Math.random());
    s.style.width = `${w}px`;
    s.style.height = `${h}px`;
    s.style.background = colors[i % colors.length];
    layer.appendChild(s);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = spread * (0.6 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = -37.57 + (Math.random() - 0.5) * 40;
    s.animate(
      [
        { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) skewX(-37.57deg) rotate(${rot}deg) scale(.4)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%) skewX(-37.57deg) rotate(${rot + 90}deg) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${x + dx * 1.15}px, ${y + dy * 1.15 + 18}px) translate(-50%, -50%) skewX(-37.57deg) rotate(${rot + 140}deg) scale(.6)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 250, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" },
    ).onfinish = () => {
      if (++done === count) layer.remove();
    };
  }
}

/** A full-screen celebration: shards rain from the top edge and burst from the centre. */
export function celebrate(from?: Element | { x: number; y: number } | null) {
  if (reducedMotion()) return;
  haptic(18);
  burst(from, { count: 28, spread: 160 });
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const count = 46;
  let done = 0;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "shard";
    const w = 5 + Math.random() * 5;
    s.style.width = `${w}px`;
    s.style.height = `${w * 2.2}px`;
    s.style.background = COLORS[i % COLORS.length];
    layer.appendChild(s);
    const x = Math.random() * window.innerWidth;
    const drift = (Math.random() - 0.5) * 160;
    const fall = window.innerHeight * (0.7 + Math.random() * 0.4);
    s.animate(
      [
        { transform: `translate(${x}px, -30px) skewX(-37.57deg) rotate(0deg)`, opacity: 1 },
        { transform: `translate(${x + drift}px, ${fall}px) skewX(-37.57deg) rotate(${360 + Math.random() * 360}deg)`, opacity: 0 },
      ],
      { duration: 1400 + Math.random() * 900, delay: Math.random() * 350, easing: "cubic-bezier(.25,.6,.4,1)", fill: "forwards" },
    ).onfinish = () => {
      if (++done === count) layer.remove();
    };
  }
}
