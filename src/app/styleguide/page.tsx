import type { Metadata } from "next";
import { ArrowRight, Flame, Plus } from "lucide-react";
import { AppIcon, Logo, LogoMark, Slogan, SocialAvatar, Tagline } from "@/components/brand/logo";
import { Aurora, ChevronLines, ChevronPattern, SlashStripes, SpeedStripes } from "@/components/brand/graphics";
import { KineticText } from "@/components/motion/kinetic";
import { Marquee } from "@/components/motion/marquee";
import { Tilt } from "@/components/motion/tilt";
import { HighlightCard, LeagueTile, MatchCard, NewsSlide, ScoreHeader, StatsTable } from "@/components/sport/cards";
import { ClubBadge } from "@/components/ui/brand";
import { SearchField, Toggle } from "@/components/ui/controls";
import { FieldSkeleton, SelectField, TextField } from "@/components/ui/fields";
import { ChipRow, EmptyState, ListRow, LiveTag, SectionHeader, Segmented, TabBarLinks, Tag } from "@/components/ui/nav";
import { Tick } from "@/components/ui/tick";

export const metadata: Metadata = { title: "Style guide", robots: { index: false } };

const COLORS = [
  { name: "Deep Navy", role: "Primary", hex: "#081018", cls: "bg-navy" },
  { name: "Electric Green", role: "Accent", hex: "#B7F34A", cls: "bg-green" },
  { name: "Cobalt Blue", role: "Secondary", hex: "#3867FF", cls: "bg-cobalt" },
  { name: "Off White", role: "Background", hex: "#F5F7F2", cls: "bg-offwhite" },
  { name: "Gray 500", role: "Muted text", hex: "#6B7280", cls: "bg-gray-500" },
  { name: "Gray 400", role: "Placeholder", hex: "#9CA3AF", cls: "bg-gray-400" },
  { name: "Gray 200", role: "Lines", hex: "#E5E7EB", cls: "bg-gray-200" },
  { name: "Gray 100", role: "Fills", hex: "#F3F4F6", cls: "bg-gray-100" },
];

const GOR = { name: "Gor Mahia", shortName: "GOR", primaryColor: "#0B8A3E", secondaryColor: "#FFFFFF" };
const AFC = { name: "AFC Leopards", shortName: "AFC", primaryColor: "#1D4FB8", secondaryColor: "#FFFFFF" };

function Block({ id, title, source, children }: { id: string; title: string; source: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-line py-10">
      <p className="kicker">{source}</p>
      <h2 className="h3 mt-1">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Living style guide: every brand asset and UI-kit component in the Riadha theme. */
export default function StyleGuide() {
  return (
    <main className="mx-auto max-w-[1040px] px-5 pb-24">
      <header className="relative isolate -mx-5 mb-4 overflow-hidden bg-navy px-5 pb-12 pt-[calc(3rem+var(--sat))] text-white">
        <Aurora />
        <SpeedStripes animated fade className="absolute -bottom-2 -left-4 w-72 opacity-80" />
        <div className="relative">
          <Logo variant="primary" theme="dark" size={48} animated />
          <p className="mt-6 max-w-[60ch] text-white/70">
            Brand from the official Riadha brand kit (design/brand-kit). Components ported from the Sportify UI kit (design/ui-kit) and redrawn in the Riadha brand. Motion is decorative and switches off with reduced motion.
          </p>
        </div>
      </header>

      <Block id="logo" title="Logo system" source="Brand kit · Logo/SVG (official outlines, never retyped)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0 [&>*]:overflow-x-auto">
          <div className="card grid min-h-44 place-items-center p-6"><Logo variant="primary" size={40} /></div>
          <div className="card grid min-h-44 place-items-center p-6"><Logo variant="stacked" size={40} /></div>
          <div className="card grid min-h-32 place-items-center p-6 md:col-span-2"><Logo variant="horizontal" size={28} /></div>
          <div className="grid min-h-40 place-items-center rounded-2xl bg-navy p-6"><Logo variant="primary" theme="dark" size={36} /></div>
          <div className="card grid min-h-40 place-items-center p-6"><Logo variant="primary" theme="mono-dark" size={36} /></div>
          <div className="grid min-h-40 place-items-center rounded-2xl bg-navy p-6"><Logo variant="primary" theme="mono-light" size={36} /></div>
          <div className="card flex min-h-40 flex-wrap items-center justify-center gap-6 p-6">
            <LogoMark className="w-16" title="Riadha monogram" />
            <AppIcon size={64} />
            <AppIcon variant="app" size={64} />
            <AppIcon variant="dark" size={64} />
            <SocialAvatar size={64} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <Tagline className="text-[11px]" />
          <Slogan className="text-[16px]" />
        </div>
      </Block>

      <Block id="motion" title="Motion & graphics" source="Brand kit · Guidelines (pattern, speed stripes, splash) · src/app/globals.css">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative isolate min-h-56 overflow-hidden rounded-2xl bg-navy p-6 text-white">
            <Aurora />
            <p className="kicker relative text-green">Aurora + kinetic type</p>
            <KineticText text="Find the *next star.*" className="relative mt-3 text-[40px] font-bold leading-none tracking-[-0.04em]" />
          </div>
          <div className="relative min-h-56 overflow-hidden rounded-2xl">
            <ChevronPattern className="absolute inset-0 h-full w-full" />
          </div>
          <div className="relative min-h-40 overflow-hidden rounded-2xl bg-navy">
            <SpeedStripes animated fade className="absolute bottom-0 left-0 w-2/3" />
            <ChevronLines className="absolute -right-10 top-0 h-full w-auto" count={6} />
          </div>
          <Tilt className="rounded-2xl">
            <div className="edge-glow grid min-h-40 place-items-center rounded-2xl bg-navy p-6 text-center text-white">
              <p className="text-[14px] text-white/70">Tilt card with gradient edge. Move the pointer over it.</p>
            </div>
          </Tilt>
        </div>
        <Marquee className="mt-4 rounded-xl bg-green py-3 text-navy">
          {["Sport", "Talent", "Scouting", "Pick your XI", "Post your run", "Get scouted"].map((t) => (
            <span key={t} className="text-[13px] font-bold uppercase tracking-[0.18em]">{t}</span>
          ))}
        </Marquee>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4" data-stagger="80">
          {["up", "blur", "slant", "wipe"].map((r) => (
            <div key={r} data-reveal={r} className="card grid h-24 place-items-center text-[13px] font-semibold">
              data-reveal=&quot;{r}&quot;
            </div>
          ))}
        </div>
        <p className="helper mt-3">Every slanted edge uses the brand diagonal (37.57° from vertical, <code>--brand-slant</code>). Never mirror stripes or chevrons: they always lean forward.</p>
      </Block>

      <Block id="colour" title="Colour" source="Brand kit · Guidelines/riadha-brand-colors">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {COLORS.map((c) => (
            <div key={c.hex} className="card overflow-hidden">
              <div className={`h-20 ${c.cls} ${c.hex === "#F5F7F2" ? "border-b border-line" : ""}`} />
              <div className="p-3">
                <p className="text-[14px] font-semibold">{c.name}</p>
                <p className="text-[12px] text-muted">{c.role} · {c.hex}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="helper mt-3">Electric Green is a fill colour. Put navy text on it; never use it for text on light backgrounds.</p>
      </Block>

      <Block id="type" title="Typography: Sora" source="Brand kit · Guidelines/riadha-typography · scale from the UI kit (H1–H10)">
        <div className="card divide-y divide-line/70">
          {[
            ["h1", "H1 · 40 Bold", "Pick your XI."],
            ["h2", "H2 · 32 Bold", "Post your run."],
            ["h3", "H3 · 26 Bold", "Get scouted."],
            ["h4", "H4 · 22 Bold", "Gameweek 7 deadline"],
            ["h5", "H5 · 18 Semibold", "Highlights"],
            ["h6", "H6 · 16 Semibold", "Karura Dawn Runners"],
          ].map(([cls, label, text]) => (
            <div key={cls} className="grid grid-cols-1 items-baseline gap-1 p-4 sm:grid-cols-[140px_1fr] sm:gap-4">
              <span className="text-[12px] text-muted">{label}</span>
              <span className={cls}>{text}</span>
            </div>
          ))}
          <div className="grid grid-cols-1 items-baseline gap-1 p-4 sm:grid-cols-[140px_1fr] sm:gap-4">
            <span className="text-[12px] text-muted">Body · 16 Regular</span>
            <span className="text-[16px]">Fantasy football for the Kenyan Premier League and a showcase for every Kenyan athlete.</span>
          </div>
          <div className="grid grid-cols-1 items-baseline gap-1 p-4 sm:grid-cols-[140px_1fr] sm:gap-4">
            <span className="text-[12px] text-muted">Overline</span>
            <span className="kicker">Riadha Fantasy · KPL</span>
          </div>
        </div>
      </Block>

      <Block id="buttons" title="Buttons" source="UI kit · Button (3 sizes × filled / dark / disabled / text, icon left / right / only)">
        <div className="flex flex-col gap-5">
          {(["btn-sm", "", "btn-lg"] as const).map((size) => (
            <div key={size || "md"} className="flex flex-wrap items-center gap-3">
              <button className={`btn btn-accent ${size}`}>Button</button>
              <button className={`btn btn-primary ${size}`}>Button <Plus size={15} /></button>
              <button className={`btn btn-cobalt ${size}`}><Plus size={15} /> Button</button>
              <button className={`btn btn-secondary ${size}`}>Button</button>
              <button className={`btn btn-ghost ${size}`}>Button <ArrowRight size={15} /></button>
              <button className={`btn btn-primary btn-icon ${size}`} aria-label="Add"><Plus size={16} /></button>
              <button className={`btn btn-accent ${size}`} disabled>Disabled</button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 rounded-2xl bg-navy p-4">
            <button className="btn btn-accent">On navy</button>
            <button className="btn btn-light">Light</button>
            <button className="btn btn-ghost-light">Text</button>
          </div>
        </div>
      </Block>

      <Block id="inputs" title="Text input" source="UI kit · Text input (default / focus / filled / error / warning / disabled / skeleton)">
        <div className="grid gap-5 md:grid-cols-3">
          <TextField label="Label" placeholder="Input text" helper="Helper text" fieldSize="sm" />
          <TextField label="Label" placeholder="Input text" helper="Helper text" />
          <TextField label="Label" placeholder="Input text" helper="Helper text" fieldSize="lg" />
          <TextField label="Label" defaultValue="Input text" error="Error message goes here" />
          <TextField label="Label" defaultValue="Input text" warning="Warning message goes here" />
          <TextField label="Label" placeholder="Input text" helper="Helper text" disabled />
          <SelectField label="County" defaultValue="Nairobi">
            <option>Nairobi</option>
            <option>Kisumu</option>
          </SelectField>
          <FieldSkeleton />
        </div>
      </Block>

      <Block id="search" title="Search" source="UI kit · Search (sizes, typing with clear, disabled)">
        <div className="grid gap-4 md:grid-cols-3">
          <SearchField placeholder="Search input text" fieldSize="sm" />
          <SearchField placeholder="Search input text" defaultValue="Typing" />
          <SearchField placeholder="Search input text" fieldSize="lg" disabled />
        </div>
      </Block>

      <Block id="toggle" title="Toggle" source="UI kit · Toggle (default and small, on / off / disabled)">
        <div className="flex flex-wrap gap-8">
          <Toggle label="Toggle label" defaultChecked />
          <Toggle label="Toggle label" />
          <Toggle label="Toggle label" disabled />
          <Toggle label="Small" small defaultChecked />
          <Toggle label="Small" small />
        </div>
      </Block>

      <Block id="nav" title="Navigation" source="UI kit screens · chips, tabs, segmented, section header, tags, list rows">
        <div className="flex flex-col gap-6">
          <ChipRow
            label="Chips"
            items={[
              { href: "#nav", label: "Trending", icon: <Flame size={14} />, active: true },
              { href: "#nav-1", label: "Football" },
              { href: "#nav-2", label: "Athletics" },
              { href: "#nav-3", label: "Basketball" },
            ]}
          />
          <TabBarLinks items={[{ href: "#nav", label: "Upcoming", active: true }, { href: "#nav-4", label: "Past matches" }]} />
          <Segmented items={[{ href: "#nav", label: "Gor Mahia", active: true }, { href: "#nav-5", label: "AFC Leopards" }]} />
          <SectionHeader title="FIFA World Cup" href="#nav" />
          <div className="flex flex-wrap gap-2">
            <Tag>Top news</Tag>
            <Tag tone="navy">Highlights</Tag>
            <Tag tone="cobalt">Athletics</Tag>
            <Tag tone="gray">Full time</Tag>
            <LiveTag />
          </div>
          <div className="flex items-center gap-4">
            <Tick role="athlete" verified size={22} /> <span className="text-[13px]">Athlete</span>
            <Tick role="club" verified size={22} /> <span className="text-[13px]">Club</span>
            <Tick role="scout" verified size={22} /> <span className="text-[13px]">Scout</span>
          </div>
          <div className="card max-w-md divide-y divide-line/70 overflow-hidden">
            <ListRow href="#nav" label="App info" />
            <ListRow href="#nav" label="Notifications" hint="On" />
          </div>
        </div>
      </Block>

      <Block id="cards" title="Cards" source="UI kit screens · news carousel, highlights, leagues, match card, score, stats">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 [&>*]:min-w-0">
          <NewsSlide href="#cards" tag="Top story" title="Faith Chebet runs 53.8s at Kamariny" meta={<><span className="font-semibold text-green">Athletics</span> · Fri 25 Sept</>} stat={{ label: "400m", value: "53.8s" }} seed={0} />
          <div className="flex flex-col gap-4">
            <HighlightCard href="#cards" title="Brace at Bukhungu" body="Two goals and three points for the Homeboyz faithful." seed={1} />
            <div className="flex gap-2">
              <LeagueTile href="#cards" badge={<ClubBadge short={GOR.shortName} primary={GOR.primaryColor} secondary={GOR.secondaryColor} size={40} />} name="Gor Mahia" />
              <LeagueTile href="#cards" badge={<ClubBadge short={AFC.shortName} primary={AFC.primaryColor} secondary={AFC.secondaryColor} size={40} />} name="AFC Leopards" />
            </div>
          </div>
          <MatchCard home={GOR} away={AFC} kickoff={new Date("2026-09-26T12:00:00Z")} homeScore={null} awayScore={null} finished={false} footer={<><b className="font-semibold">Gameweek 7</b><span className="text-white/60"> · Mashemeji Derby</span></>} />
          <ScoreHeader home={GOR} away={AFC} homeScore={2} awayScore={1} status="Full time" sub="Gameweek 6 · Kenyan Premier League" />
          <div className="md:col-span-2">
            <StatsTable
              rows={[
                { n: "Otieno", min: 90, g: 1, a: 0, pts: 9 },
                { n: "Wafula", min: 90, g: 0, a: 1, pts: 6 },
                { n: "Barasa", min: 64, g: 0, a: 0, pts: 2 },
              ]}
              rowKey={(r) => r.n}
              columns={[
                { key: "n", label: "Player", render: (r) => <span className="font-semibold">{r.n}</span> },
                { key: "min", label: "Min", align: "right", render: (r) => r.min },
                { key: "g", label: "G", align: "right", render: (r) => r.g },
                { key: "a", label: "A", align: "right", render: (r) => r.a },
                { key: "pts", label: "Pts", align: "right", strong: true, render: (r) => r.pts },
              ]}
            />
          </div>
          <EmptyState title="Nothing here yet" body="Follow athletes and clubs to fill this feed." action={<span className="btn btn-accent">Discover athletes</span>} />
        </div>
      </Block>

      <Block id="graphics" title="Graphic elements" source="Brand board 15–16">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <ChevronPattern className="h-48 w-full rounded-2xl" />
          <div className="relative h-48 overflow-hidden rounded-2xl bg-navy">
            <SlashStripes className="absolute -bottom-1 -left-1 w-40" />
          </div>
        </div>
      </Block>
    </main>
  );
}
