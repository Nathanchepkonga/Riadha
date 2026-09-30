import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/components/brand/logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** App icon from the brand board: electric-green square, navy mark (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#B7F34A" }}>
        <svg width="104" height="83" viewBox="0 0 100 80">
          {MARK_PATHS.map((d) => (
            <path key={d.slice(0, 12)} d={d} fill="#081018" />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
