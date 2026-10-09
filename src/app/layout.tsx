import type { Metadata, Viewport } from "next";
import { Sora } from "next/font/google";
import { Logo, Slogan } from "@/components/brand/logo";
import { Aurora, SpeedStripes } from "@/components/brand/graphics";
import { RevealObserver } from "@/components/motion/reveal-observer";
import "./globals.css";

// Brand typeface (kit): Sora for everything. The wordmark is outlined artwork in <Logo>.
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });

export const metadata: Metadata = {
  // Absolute base for Open Graph/Twitter images. Set NEXT_PUBLIC_SITE_URL in production.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Riadha · Pick your XI. Post your run. Get scouted.", template: "%s · Riadha" },
  description: "Sport · Talent · Scouting. Fantasy football for the Kenyan Premier League and a showcase for every Kenyan athlete.",
  applicationName: "Riadha",
  // "default" keeps iOS's status bar (time, battery, Dynamic Island) in its own band with dark text,
  // instead of drawing the page underneath it as "black-translucent" does.
  appleWebApp: { capable: true, title: "Riadha", statusBarStyle: "default" },
  // Stop iOS turning scores, prices and dates into tappable phone links.
  formatDetection: { telephone: false, date: false, address: false, email: false },
  openGraph: {
    siteName: "Riadha",
    images: [{ url: "/brand/og-cover.png", width: 1500, height: 500, alt: "Riadha: Sport, Talent, Scouting" }],
  },
  twitter: { card: "summary_large_image", images: ["/brand/og-cover.png"] },
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

// Runs before first paint: flags JS (so scroll reveals may hide content) and decides whether the
// launch splash plays. It plays once per browser session, and only when entering the app itself,
// never on shared profile/post links or admin pages.
const BOOT = `(function(){var d=document.documentElement;d.classList.add("js");try{var p=location.pathname;var entry=p==="/"||p==="/login"||/^\\/(feed|watch|fantasy|fixtures|me|discover|communities|c\\/|market|scout)/.test(p);if(!entry||sessionStorage.getItem("riadha-splash")){d.dataset.splash="skip"}else{sessionStorage.setItem("riadha-splash","1")}}catch(e){d.dataset.splash="skip"}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script adds a class and data attribute to <html> before hydration.
    <html lang="en" className={`${sora.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <RevealObserver />
        <div className="splash" aria-hidden>
          <Aurora intensity={0.8} />
          <SpeedStripes animated fade className="absolute bottom-0 left-0 w-[78%] max-w-[420px] opacity-90" />
          <div className="relative flex flex-col items-center">
            <Logo variant="stacked" theme="dark" size={56} animated />
            <Slogan light className="animate-rise-in ad-1000 mt-7 text-[14px] tracking-wide" />
          </div>
          <span className="splash-bar" />
        </div>
      </body>
    </html>
  );
}
