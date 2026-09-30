import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/components/brand/logo";

// PWA install icons. "any" = the brand favicon (navy rounded square, green mark).
// "maskable" = full-bleed navy with the mark inside Android's safe zone, so launchers can crop it
// to a circle / squircle without clipping the logo.
const VARIANTS = {
  "192": { size: 192, maskable: false },
  "512": { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[variant]">) {
  const { variant } = await ctx.params;
  const v = VARIANTS[variant as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  const markW = Math.round(v.size * (v.maskable ? 0.46 : 0.58));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#081018",
          borderRadius: v.maskable ? 0 : v.size * 0.22,
        }}
      >
        <svg width={markW} height={Math.round(markW * 0.8)} viewBox="0 0 100 80">
          {MARK_PATHS.map((d) => (
            <path key={d.slice(0, 12)} d={d} fill="#B7F34A" />
          ))}
        </svg>
      </div>
    ),
    { width: v.size, height: v.size },
  );
}
