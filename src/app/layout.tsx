import type { Metadata, Viewport } from "next";
import { Montserrat, Sora } from "next/font/google";
import "./globals.css";

// Brand type: Sora for the UI; Montserrat only inside the logo lockup (wordmark, tagline, slogan).
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Riadha · Pick your XI. Post your run. Get scouted.", template: "%s · Riadha" },
  description: "Sport · Talent · Scouting. Fantasy football for the Kenyan Premier League and a showcase for every Kenyan athlete.",
  applicationName: "Riadha",
  // "default" keeps iOS's status bar (time, battery, Dynamic Island) in its own band with dark text,
  // instead of drawing the page underneath it as "black-translucent" does.
  appleWebApp: { capable: true, title: "Riadha", statusBarStyle: "default" },
  // Stop iOS turning scores, prices and dates into tappable phone links.
  formatDetection: { telephone: false, date: false, address: false, email: false },
};

export const viewport: Viewport = {
  // Matches the off-white app bar so the browser/status bar blends in. Navy pages override this.
  themeColor: "#F5F7F2",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // Edge-to-edge; every edge-anchored element pads itself with the safe-area vars in globals.css.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${montserrat.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
