import { ImageResponse } from "next/og";
import { MARK_PATHS } from "@/components/brand/logo";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Favicon from the brand board: navy rounded square, electric-green mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#081018", borderRadius: 120 }}>
        <svg width="300" height="240" viewBox="0 0 100 80">
          {MARK_PATHS.map((d) => (
            <path key={d.slice(0, 12)} d={d} fill="#B7F34A" />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
