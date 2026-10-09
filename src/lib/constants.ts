export const SPORTS = ["Football", "Athletics", "Basketball", "Rugby", "Volleyball", "Boxing", "Running", "Swimming", "Cricket", "Hockey", "Other"];

export const COUNTIES = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Uasin Gishu", "Kakamega", "Kiambu", "Machakos", "Elgeyo-Marakwet", "Nandi",
  "Kericho", "Bomet", "Kisii", "Nyamira", "Migori", "Homa Bay", "Siaya", "Busia", "Bungoma", "Vihiga", "Trans Nzoia",
  "West Pokot", "Turkana", "Baringo", "Laikipia", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Embu", "Meru",
  "Tharaka-Nithi", "Isiolo", "Marsabit", "Samburu", "Kajiado", "Narok", "Makueni", "Kitui", "Garissa", "Wajir",
  "Mandera", "Lamu", "Tana River", "Kilifi", "Kwale", "Taita-Taveta",
];

/** Sports and interests a community can be about. */
export const COMMUNITY_INTERESTS = ["Running", "Football", "Athletics", "Basketball", "Rugby", "Volleyball", "Boxing", "Swimming", "Cycling", "Chess", "Fitness", "Hiking", "Esports", "Other"];

export type BusinessCategoryValue = "gym" | "academy" | "shop" | "physio" | "coach" | "venue" | "nutrition" | "other";

export const BUSINESS_CATEGORIES: { value: BusinessCategoryValue; label: string; plural: string }[] = [
  { value: "gym", label: "Gym", plural: "Gyms" },
  { value: "academy", label: "Academy", plural: "Academies" },
  { value: "shop", label: "Sports shop", plural: "Shops" },
  { value: "physio", label: "Physio & recovery", plural: "Physios" },
  { value: "coach", label: "Coach / trainer", plural: "Coaches" },
  { value: "venue", label: "Venue / pitch", plural: "Venues" },
  { value: "nutrition", label: "Nutrition", plural: "Nutrition" },
  { value: "other", label: "Other", plural: "Other" },
];

export const categoryLabel = (c: string) => BUSINESS_CATEGORIES.find((x) => x.value === c)?.label ?? c;

/** Suggested amenities for business listings (owners can add their own). */
export const AMENITIES = [
  "Free weights", "Cardio machines", "Group classes", "Personal training", "Showers", "Lockers", "Parking", "Sauna",
  "Swimming pool", "Floodlit pitch", "Astro turf", "Changing rooms", "Physiotherapy", "Ice baths", "Sports massage",
  "Altitude training", "Track access", "Equipment hire", "Kit printing", "M-Pesa accepted", "Wheelchair access", "Café",
];

/** Suggested skill tags per sport for athlete scouting profiles. */
export const SKILLS: Record<string, string[]> = {
  Football: ["Pace", "Dribbling", "Finishing", "Passing", "Vision", "Crossing", "Tackling", "Heading", "Set pieces", "Weak foot", "Shot stopping", "Distribution", "Leadership", "Work rate"],
  Athletics: ["Endurance", "Sprint finish", "Pacing", "Altitude trained", "Hurdles", "Jumps", "Throws", "Race tactics"],
  Running: ["Endurance", "Sprint finish", "Pacing", "Altitude trained", "Trail", "Hill strength"],
  Basketball: ["Shooting", "Ball handling", "Rebounding", "Defence", "Court vision", "Athleticism", "Free throws"],
  Rugby: ["Tackling", "Speed", "Kicking", "Line-outs", "Scrummaging", "Offloads", "Sevens"],
  Volleyball: ["Spiking", "Blocking", "Serving", "Setting", "Digging", "Vertical jump"],
  Boxing: ["Footwork", "Power", "Counter-punching", "Defence", "Stamina", "Southpaw"],
  Swimming: ["Freestyle", "Butterfly", "Backstroke", "Breaststroke", "Starts", "Turns", "Open water"],
};
export const ALL_SKILLS = [...new Set(Object.values(SKILLS).flat())];
