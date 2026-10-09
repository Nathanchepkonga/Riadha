import { Bike, CircleDot, Crown, Dumbbell, Footprints, Gamepad2, Goal, Mountain, Shield, Sparkles, Swords, Timer, Volleyball, Waves, type LucideIcon, type LucideProps } from "lucide-react";
import { ChevronLines } from "@/components/brand/graphics";
import { cn } from "@/lib/format";

const ICONS: Record<string, LucideIcon> = {
  Running: Footprints,
  Football: Goal,
  Athletics: Timer,
  Basketball: CircleDot,
  Rugby: Shield,
  Volleyball: Volleyball,
  Boxing: Swords,
  Swimming: Waves,
  Cycling: Bike,
  Chess: Crown,
  Fitness: Dumbbell,
  Hiking: Mountain,
  Esports: Gamepad2,
};

/** The icon for a community's sport or interest. */
export function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  const Icon = ICONS[category] ?? Sparkles;
  return <Icon {...props} />;
}

const SKINS = [
  { bg: "bg-navy", fg: "text-green", lines: "#3867FF", op: 0.4 },
  { bg: "bg-cobalt", fg: "text-white", lines: "#FFFFFF", op: 0.2 },
  { bg: "bg-green", fg: "text-navy", lines: "#081018", op: 0.14 },
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** A community's cover: the uploaded photo, or brand art (chevrons + the category icon) keyed to its name. */
export function CommunityCover({ name, category, coverUrl, className, iconSize = 64 }: { name: string; category: string; coverUrl: string | null; className?: string; iconSize?: number }) {
  if (coverUrl) {
    return (
      <div className={cn("relative overflow-hidden bg-navy", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- owner uploads served from /media */}
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const skin = SKINS[hash(name) % SKINS.length];
  return (
    <div className={cn("relative overflow-hidden", skin.bg, className)} aria-hidden>
      <ChevronLines className="absolute -left-10 top-1/2 h-[180%] w-auto -translate-y-1/2" count={7} color={skin.lines} opacity={skin.op} />
      <CategoryIcon category={category} size={iconSize} strokeWidth={1.6} className={cn("absolute bottom-3 right-4 opacity-90", skin.fg)} />
    </div>
  );
}
