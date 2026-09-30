import { Search } from "lucide-react";
import { CountUp } from "@/components/motion/count-up";
import { Logo } from "@/components/brand/logo";
import { SlashStripes } from "@/components/brand/graphics";
import { Silhouette } from "@/components/profile/silhouette";
import { Tick } from "@/components/ui/tick";

/* Three 390×844 app screens for the landing hero, drawn in the Riadha brand. */

function PhoneNav() {
  return (
    <div className="absolute inset-x-0 top-0 z-30 mt-[54px] flex h-14 items-center justify-between px-5">
      <Logo variant="compact" theme="dark" size={24} />
      <span className="flex gap-1">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><Search size={20} strokeWidth={2.4} /></span>
        <span className="flex h-11 w-11 flex-col items-end justify-center gap-[5px] rounded-full pr-3">
          <i className="block h-[2px] w-[19px] rounded-full bg-white" />
          <i className="block h-[2px] w-[9px] rounded-full bg-white" />
        </span>
      </span>
    </div>
  );
}

function Flag() {
  return (
    <span
      aria-hidden
      className="inline-block h-[14px] w-[21px] rounded-[2px]"
      style={{ background: "linear-gradient(180deg,#000 0 30%,#fff 30% 35%,#BB0000 35% 65%,#fff 65% 70%,#006600 70%)" }}
    />
  );
}

/** Athlete hero: Iten, name speed-reveal over a soft floor blur. */
export function AthleteScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-navy font-sans">
      <PhoneNav />
      <div className="animate-fade-slide-up ad-300 absolute inset-x-5 top-[140px] z-10">
        <p className="flex items-center gap-2 text-[16px] text-white/60">Elgeyo-Marakwet <Flag /></p>
        <p className="mt-1 text-[44px] font-bold leading-[0.98] tracking-[-0.04em] text-white">Iten<br />Home of Champions</p>
      </div>
      <div
        aria-hidden
        className="absolute inset-x-[-20%] bottom-0 z-[2] h-[46%] origin-bottom"
        style={{ background: "repeating-linear-gradient(90deg,transparent 0 52px,rgba(183,243,74,.28) 52px 55px)", transform: "perspective(260px) rotateX(55deg)" }}
      />
      <div className="animate-scale-in ad-500 absolute inset-x-0 bottom-0 z-[5] flex h-[62%] origin-bottom justify-center">
        <Silhouette shirt="#3867FF" trim="#B7F34A" />
      </div>
      <div className="floor-blur absolute inset-x-0 bottom-0 z-[6] h-1/2" />
      <div className="absolute inset-x-0 bottom-0 z-[6] h-1/2 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6">
        <div className="animate-fade-slide-up ad-700 mb-3 flex">
          {["#B7F34A", "#3867FF", "#F5F7F2"].map((bg, i) => (
            <span key={bg} className={`-mr-2 h-12 w-12 rounded-full border-2 border-navy ${i === 1 ? "outline-2 outline-offset-1 outline-green" : ""}`} style={{ background: bg }} />
          ))}
        </div>
        <p className="text-[62px] font-bold leading-[0.86] tracking-[-0.05em] text-white">
          <span className="animate-speed-reveal ad-800 block">Faith</span>
          <span className="animate-speed-reveal ad-900 flex items-center gap-3">
            Chebet <Tick role="athlete" verified size={30} />
          </span>
        </p>
      </div>
    </div>
  );
}

/** Fantasy points: season line draws in, numbers count up like a scoreboard. */
export function PointsScreen() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-navy px-5 pb-8 pt-[140px] font-sans text-white">
      <PhoneNav />
      <div className="animate-fade-slide-up ad-400 z-10 mb-4">
        <p className="flex items-center gap-2 text-[16px] text-white/60">Gameweek 7 <Flag /></p>
        <p className="mt-1 text-[44px] font-bold leading-[0.98] tracking-[-0.04em]">Mashemeji<br />Derby Day</p>
      </div>
      <div className="animate-scale-in ad-600 z-10 flex min-h-0 flex-1 items-center">
        <svg viewBox="0 0 260 110" className="h-[150px] w-full" preserveAspectRatio="none" aria-hidden>
          <path d="M0 95 L30 80 L60 86 L90 60 L120 66 L150 40 L180 48 L210 22 L260 12" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
          <path className="animate-draw ad-600" style={{ ["--len" as string]: 320 }} d="M0 95 L30 80 L60 86 L90 60 L120 66 L150 40 L180 48 L210 22 L260 12" fill="none" stroke="#B7F34A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="255" cy="13" r="5" fill="#3867FF" />
        </svg>
      </div>
      <div className="animate-fade-slide-up ad-800 z-10 mt-auto pt-4">
        <p className="mb-3 text-[14px] text-white/60">GW points · Season · Rank</p>
        <CountUp to={64} delay={800} className="block text-[100px] font-bold leading-[0.8] tracking-[-0.06em] text-white tabular" />
        <CountUp to={412} delay={1000} className="block text-[100px] font-bold leading-[0.8] tracking-[-0.06em] text-white/45 tabular" />
        <CountUp to={12408} delay={1200} grouped={false} className="block text-[100px] font-bold leading-[0.8] tracking-[-0.06em] text-green tabular" />
      </div>
    </div>
  );
}

/** Club: 21K route draws in, glass pace-group cards float over it. */
export function ClubScreen() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-navy font-sans text-white">
      <SlashStripes className="absolute -right-6 top-[120px] w-44 rotate-180 opacity-60" />
      <PhoneNav />
      <div className="animate-fade-slide-up ad-300 absolute left-5 top-[140px] z-10">
        <p className="flex items-center gap-2 text-[15px] text-white/60">Club <Tick role="club" verified size={18} /></p>
        <p className="mt-1 text-[48px] font-bold leading-[0.92] tracking-[-0.05em]">Karura Dawn<br />Runners</p>
      </div>
      <div className="animate-fade-slide-up ad-500 absolute left-5 top-[290px] z-10">
        <p className="text-[15px] text-white/60">Sunday long run</p>
        <p className="text-[112px] font-bold leading-[0.85] tracking-[-0.07em] text-green">21K</p>
      </div>
      <div className="animate-fade-slide-left ad-700 absolute inset-x-3 top-[440px] z-10">
        <svg viewBox="0 0 260 90" className="w-full" aria-hidden>
          <path className="animate-draw ad-800" style={{ ["--len" as string]: 420 }} d="M10 70 C40 20, 70 80, 100 45 S150 10, 170 40 S220 85, 250 25" fill="none" stroke="#B7F34A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="10" cy="70" r="5" fill="#3867FF" />
          <circle cx="250" cy="25" r="5" fill="#B7F34A" />
        </svg>
      </div>
      <div className="animate-fade-slide-up ad-900 absolute inset-x-0 bottom-0 z-10 flex">
        {[
          { n: "Pace group A", s: "4:30/km · 6:00am", v: 38, tick: true },
          { n: "Pace group B", s: "5:15/km · 6:00am", v: 112 },
        ].map((c) => (
          <div key={c.n} className="glass-dark flex h-[200px] w-1/2 flex-col rounded-t-2xl border-b-0 p-3">
            <p className="flex items-center gap-1.5 text-[13px] text-white/60">{c.n} {c.tick && <Tick role="athlete" verified size={13} />}</p>
            <p className="mt-1 text-[11px] text-white/75 tabular">{c.s}</p>
            <p className="mt-auto text-[100px] font-bold leading-[0.82] tracking-[-0.07em]">{c.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
