/*
 * Chat safety filter, shared by the browser (instant feedback) and the server (the real check).
 * Riadha has under-18 members, so league chats refuse, before anything is stored:
 *   - abusive, sexual or hateful language (English, Swahili, Sheng), including l33t spellings,
 *     s p a c e d - o u t letters and stretched letters ("fuuuck");
 *   - phone numbers (Kenyan and international, digits or spelled out), email addresses;
 *   - payment card numbers (any 13–19 digit number that passes the Luhn checksum);
 *   - national ID and KRA PIN numbers when labelled as such;
 *   - the sender's own real name (chats show team names only).
 * The word lists are a starting point: add terms as moderators see them. Keep entries lowercase and
 * prefer whole words, so innocent words that contain them (e.g. "Dickson", "assist") pass.
 */

export type FilterKind = "abuse" | "phone" | "card" | "email" | "id" | "name";

export type FilterResult = { ok: true } | { ok: false; kind: FilterKind; notice: string };

/** Friendly, specific reminders shown privately to the sender. */
export const NOTICES: Record<FilterKind, string> = {
  abuse:
    "Let's keep it friendly. Riadha is a community for athletes and fans of every age, so insults, slurs and swearing can't be sent. Banter about the game is always welcome.",
  phone: "For everyone's safety, phone numbers can't be shared in league chats. Keep the conversation here on Riadha.",
  card: "Never share card details in a chat. Riadha will never ask for your card number, PIN or M-Pesa PIN, and neither should anyone else.",
  email: "Email addresses stay private in league chats. Chat here instead.",
  id: "ID and KRA PIN numbers are private. Please don't share them in chats.",
  name: "League chats use team names only, so your real name stays private. Try again without it.",
};

// Whole words (after normalising). `*` at the end = also matches longer forms ("fuck*" → fucking, fucker).
const WORDS = [
  // English profanity and sexual terms
  "fuck*", "fck", "fuk*", "fucc*", "motherfuck*", "shit*", "bullshit", "bitch*", "bastard*", "cunt*", "dick", "dickhead*", "cock", "cocksuck*",
  "pussy", "pussies", "asshole*", "arsehole*", "wanker*", "twat*", "whore*", "slut*", "porn*", "nude*", "boobs", "tits", "jerkoff",
  "stfu", "kys", "rapist*", "rape", "raped", "raping", "moron*", "imbecile*", "dumbass*",
  // Slurs
  "nigger*", "nigga*", "negro*", "faggot*", "fag", "fags", "dyke*", "retard*", "tranny*", "spastic*",
  // Swahili and Sheng insults and vulgarity
  "kuma", "kumamako", "kumanyoko", "kumanina", "nyoko", "nyokoo", "msenge*", "malaya", "mkundu", "mavi", "kunguni",
  "kiherehere", "mpumbavu", "wapumbavu", "pumbavu",
  // Ethnic hate terms from Kenya's NCIC hate speech lexicon (context-free in a sports chat)
  "madoadoa", "kwekwe", "chinja kafir", "kama noma noma",
];

// Insults that only count when aimed at someone ("you're such an idiot", "wewe ni mjinga", "fala wewe"),
// so match talk like "what a stupid own goal" or "that transfer was dumb" stays allowed.
const INSULTS = ["idiot*", "stupid*", "dumb", "loser*", "fool", "fools", "clown", "clowns", "useless", "trash", "mjinga", "wajinga", "fala", "mafala", "nugu", "mbwa", "takataka"];
const YOU = new Set(["you", "u", "ur", "yall", "wewe", "wee", "nyinyi", "nyie"]);
// Words allowed between "you" and the insult: "you are", "u r", "you're" (→ "you re"), "such a", "ni"…
const FILLER = new Set(["are", "r", "re", "is", "ni", "a", "an", "such", "so", "the", "one", "total", "complete", "absolute", "bloody", "real", "big", "proper", "just", "really", "very", "mtu", "kabisa"]);

// Phrases matched on the normalised text with spaces.
const PHRASES = ["kill yourself", "kill urself", "go kill yourself", "go die", "jiue", "jinyonge", "your mother is", "mama yako ni"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "9": "g", "+": "t" };

/** Lowercase, strip accents, undo l33t and squeeze letters repeated 3+ times. */
function normalise(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0-9!@$+]/g, (c) => LEET[c] ?? c)
    .replace(/([a-z])\1{2,}/g, "$1");
}

function tokens(text: string) {
  const norm = normalise(text);
  const raw = norm.split(/[^a-z]+/).filter(Boolean);
  // Re-join letters spaced or dotted out ("f u c k", "f.u.c.k") into one token.
  const joined: string[] = [];
  let run = "";
  for (const t of raw) {
    if (t.length === 1) run += t;
    else {
      if (run.length >= 3) joined.push(run);
      run = "";
    }
  }
  if (run.length >= 3) joined.push(run);
  return { words: raw, joined, spaced: ` ${raw.join(" ")} ` };
}

function isInsult(w: string) {
  return INSULTS.some((e) => (e.endsWith("*") ? w.startsWith(e.slice(0, -1)) : w === e));
}

function isDirectedInsult(words: string[]) {
  return words.some((w, i) => {
    if (!isInsult(w)) return false;
    for (let j = i - 1; j >= 0 && j >= i - 6; j--) {
      if (YOU.has(words[j])) return true;
      if (!FILLER.has(words[j]) && !isInsult(words[j])) break;
    }
    const next = words[i + 1] === "kabisa" ? words[i + 2] : words[i + 1];
    return YOU.has(next ?? "");
  });
}

function isAbusive(text: string) {
  const { words, joined, spaced } = tokens(text);
  // Spelled-out letters are deliberate, so any listed word inside them counts ("a f u c k i n g").
  if (joined.some((run) => WORDS.some((e) => !e.includes(" ") && e.replace("*", "").length >= 4 && run.includes(e.replace("*", ""))))) return true;
  for (const entry of WORDS) {
    if (entry.includes(" ")) {
      if (spaced.includes(` ${entry} `)) return true;
      continue;
    }
    const prefix = entry.endsWith("*");
    const stem = prefix ? entry.slice(0, -1) : entry;
    // Squeeze doubled letters in the stem too, so "fuuck"/"fuck" and "shitt"/"shit" meet.
    if (words.some((w) => (prefix ? w.startsWith(stem) : w === stem) || w.replace(/([a-z])\1+/g, "$1") === stem.replace(/([a-z])\1+/g, "$1"))) return true;
  }
  if (isDirectedInsult(words)) return true;
  return PHRASES.some((p) => spaced.includes(` ${p} `) || spaced.includes(` ${p}`));
}

/** Luhn checksum, used by every card network. */
function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9",
  sifuri: "0", moja: "1", mbili: "2", tatu: "3", nne: "4", tano: "5", sita: "6", saba: "7", nane: "8", tisa: "9",
};

/** Digit runs allowing spaces, dots, dashes and brackets between digits ("0712 345 678", "+254-712…"). */
function digitRuns(text: string) {
  // Slashes and colons don't join digits, so dates and kick-off times ("12/10/2026 13:00") stay allowed.
  const runs = [...text.matchAll(/\+?\d(?:[\s.\-()]{0,2}\d)+/g)].map((m) => ({ digits: m[0].replace(/\D/g, ""), plus: m[0].startsWith("+") }));
  // Numbers written as words: "zero seven one two…" / "sifuri saba moja…".
  const words = text.toLowerCase().split(/[^a-z]+/);
  let spelled = "";
  for (const w of words) {
    if (NUMBER_WORDS[w]) spelled += NUMBER_WORDS[w];
    else {
      if (spelled.length >= 7) runs.push({ digits: spelled, plus: false });
      spelled = "";
    }
  }
  if (spelled.length >= 7) runs.push({ digits: spelled, plus: false });
  return runs;
}

function personalNumber(text: string): FilterKind | null {
  // Labelled national ID numbers (7–8 digits) and KRA PINs (A123456789Z) first: they look like phones.
  if (/\b(id|i\.d|kitambulisho|national id|id no|id number)\b[^\d]{0,12}\d{7,8}\b/i.test(text)) return "id";
  if (/\b[ap]\d{9}[a-z]\b/i.test(text)) return "id";
  for (const { digits, plus } of digitRuns(text)) {
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) return "card";
    // Kenyan mobiles/landlines: 07xx/01xx (10 digits), 2547xx/2541xx (12), 7xx/1xx (9); or any +international.
    if (/^0[17]\d{8}$/.test(digits) || /^254[17]\d{8}$/.test(digits) || /^[17]\d{8}$/.test(digits)) return "phone";
    if (plus && digits.length >= 8 && digits.length <= 15) return "phone";
    if (digits.length >= 10 && digits.length <= 15) return "phone";
  }
  return null;
}

const EMAIL = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9.-]+\s*(\.|\(dot\)|\sdot\s)\s*[a-z]{2,}/i;

/** Whether the text contains the sender's own full name ("Faith Chebet"), in any case or spacing. */
function containsRealName(text: string, realName?: string | null) {
  if (!realName) return false;
  const parts = realName.toLowerCase().split(/\s+/).filter((p) => p.length >= 3);
  if (parts.length < 2) return false;
  const words = text.toLowerCase().split(/[^a-zÀ-ɏ']+/);
  // First and last name next to each other, or both present anywhere in a short message.
  const joined = ` ${words.join(" ")} `;
  if (joined.includes(` ${parts[0]} ${parts[parts.length - 1]} `)) return true;
  return parts.every((p) => words.includes(p));
}

/** Checks a chat message (or a team name). The server must always run this, whatever the client did. */
export function checkMessage(text: string, opts: { realName?: string | null } = {}): FilterResult {
  const fail = (kind: FilterKind): FilterResult => ({ ok: false, kind, notice: NOTICES[kind] });
  const card = personalNumber(text);
  if (card) return fail(card);
  if (EMAIL.test(text)) return fail("email");
  if (isAbusive(text)) return fail("abuse");
  if (containsRealName(text, opts.realName)) return fail("name");
  return { ok: true };
}
