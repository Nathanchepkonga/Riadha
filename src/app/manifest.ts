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
    // Launch splash = the brand splash (navy); the status bar then matches the off-white app bar.
    background_color: "#081018",
    theme_color: "#F5F7F2",
    categories: ["sports", "social"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
