/** Placeholder athlete bust shown until a hero photo is uploaded. Solid fills: safe to render many times per page. */
export function Silhouette({ shirt = "#E3161D", trim = "#FFFFFF" }: { shirt?: string; trim?: string }) {
  return (
    <svg viewBox="0 0 400 520" className="h-full w-auto" aria-hidden>
      <rect x="170" y="170" width="60" height="80" rx="24" fill="#241813" />
      <ellipse cx="200" cy="128" rx="60" ry="72" fill="#2e1f18" />
      <ellipse cx="182" cy="104" rx="22" ry="30" fill="#3d2a21" opacity=".7" />
      <path d="M30 520 C 38 340, 118 262, 200 256 C 282 262, 362 340, 370 520 Z" fill={shirt} />
      <path d="M200 256 C 282 262, 362 340, 370 520 L 250 520 C 260 400, 240 300, 200 256 Z" fill="#000" opacity=".18" />
      <path d="M160 262 C 176 292, 224 292, 240 262" fill="none" stroke={trim} strokeWidth="8" strokeLinecap="round" opacity=".9" />
      <path d="M96 330 L 118 520 M304 330 L 282 520" stroke={trim} strokeOpacity=".25" strokeWidth="6" />
    </svg>
  );
}
