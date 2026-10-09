import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Riadha",
    short_name: "Riadha",
    description: "Sport · Talent · Scouting. Pick your XI. Post your run. Get scouted.",
    start_url: "/feed",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Launch splash = the brand splash (navy, as in the kit); the status bar then matches the app bar.
    background_color: "#081018",
    theme_color: "#F5F7F2",
    categories: ["sports", "social"],
    // Kit Favicon/android-chrome icons: full-bleed green with the navy mark well inside the 80% safe
    // circle, so the same files work as maskable icons.
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
