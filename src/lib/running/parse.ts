/*
 * Reads activity files exported from watches and other apps (GPX, TCX, Garmin FIT) on the phone, so only
 * a compact track is uploaded instead of a multi-megabyte file. The server re-checks everything.
 * Browser-only (DOMParser; the FIT SDK is loaded on demand).
 */
import type { Sport, TrackPoint } from "./track";

export type ParsedActivity = {
  fileName: string;
  source: "gpx" | "tcx" | "fit";
  startedAt: Date;
  sport: Sport;
  points: TrackPoint[];
  device: string | null;
  name: string | null;
};

function sportFrom(text: string | null | undefined): Sport {
  const s = (text ?? "").toLowerCase();
  if (/bik|cycl|ride/.test(s)) return "ride";
  if (/walk|hik/.test(s)) return "walk";
  return "run";
}

/** Converts absolute timestamps to seconds from the first point. */
function relative(rows: { lat: number; lng: number; at: number; ele: number | null }[]): { startedAt: Date; points: TrackPoint[] } | null {
  const ok = rows.filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && Number.isFinite(r.at));
  if (ok.length < 10) return null;
  const t0 = Math.min(...ok.map((r) => r.at));
  return { startedAt: new Date(t0), points: ok.map((r) => [r.lat, r.lng, (r.at - t0) / 1000, r.ele]) };
}

function parseXml(text: string) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("This file isn't valid XML.");
  return doc;
}
const child = (el: Element, name: string) => el.getElementsByTagNameNS("*", name)[0] ?? null;
const num = (el: Element | null) => (el?.textContent ? Number(el.textContent) : NaN);

function parseGpx(text: string, fileName: string): ParsedActivity {
  const doc = parseXml(text);
  const pts = [...doc.getElementsByTagNameNS("*", "trkpt")];
  const rows = pts.map((p) => {
    const ele = num(child(p, "ele"));
    return { lat: Number(p.getAttribute("lat")), lng: Number(p.getAttribute("lon")), at: Date.parse(child(p, "time")?.textContent ?? ""), ele: Number.isFinite(ele) ? ele : null };
  });
  const r = relative(rows);
  if (!r) throw new Error("No timed GPS points in this GPX file. Export it from your watch app with times included.");
  const trk = doc.getElementsByTagNameNS("*", "trk")[0];
  return {
    fileName,
    source: "gpx",
    ...r,
    sport: sportFrom(trk ? child(trk, "type")?.textContent : null),
    device: doc.documentElement.getAttribute("creator"),
    name: (trk && child(trk, "name")?.textContent?.trim()) || null,
  };
}

function parseTcx(text: string, fileName: string): ParsedActivity {
  const doc = parseXml(text);
  const rows = [...doc.getElementsByTagNameNS("*", "Trackpoint")].map((p) => {
    const ele = num(child(p, "AltitudeMeters"));
    return { lat: num(child(p, "LatitudeDegrees")), lng: num(child(p, "LongitudeDegrees")), at: Date.parse(child(p, "Time")?.textContent ?? ""), ele: Number.isFinite(ele) ? ele : null };
  });
  const r = relative(rows);
  if (!r) throw new Error("No GPS points in this TCX file (treadmill runs have no route).");
  const activity = doc.getElementsByTagNameNS("*", "Activity")[0];
  const creator = activity ? child(activity, "Creator") : null;
  return { fileName, source: "tcx", ...r, sport: sportFrom(activity?.getAttribute("Sport")), device: (creator && child(creator, "Name")?.textContent) || null, name: null };
}

const SEMICIRCLE = 180 / 2 ** 31;

async function parseFit(buffer: ArrayBuffer, fileName: string): Promise<ParsedActivity> {
  const { Decoder, Stream } = await import("@garmin/fitsdk");
  const decoder = new Decoder(Stream.fromArrayBuffer(buffer));
  if (!decoder.isFIT()) throw new Error("This isn't a FIT activity file.");
  const { messages } = decoder.read({ convertDateTimesToDates: true });
  const rows = (messages.recordMesgs ?? []).map((m) => {
    const ele = (m.enhancedAltitude ?? m.altitude) as number | undefined;
    return {
      lat: typeof m.positionLat === "number" ? m.positionLat * SEMICIRCLE : NaN,
      lng: typeof m.positionLong === "number" ? m.positionLong * SEMICIRCLE : NaN,
      at: m.timestamp instanceof Date ? m.timestamp.getTime() : NaN,
      ele: typeof ele === "number" && Number.isFinite(ele) ? ele : null,
    };
  });
  const r = relative(rows);
  if (!r) throw new Error("No GPS points in this FIT file (indoor and treadmill activities have no route).");
  const session = messages.sessionMesgs?.[0];
  const file = messages.fileIdMesgs?.[0];
  const device = [file?.manufacturer, file?.productName ?? file?.garminProduct].filter((x) => typeof x === "string" && x).join(" ") || null;
  return { fileName, source: "fit", ...r, sport: sportFrom(String(session?.sport ?? "")), device, name: null };
}

export const ACCEPT = ".gpx,.tcx,.fit,application/gpx+xml,application/vnd.garmin.tcx+xml";

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
  if (file.size > 40 * 1024 * 1024) throw new Error(`${file.name} is over 40MB.`);
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "fit") return parseFit(await file.arrayBuffer(), file.name);
  const text = await file.text();
  if (ext === "tcx" || text.includes("<TrainingCenterDatabase")) return parseTcx(text, file.name);
  if (ext === "gpx" || text.includes("<gpx")) return parseGpx(text, file.name);
  throw new Error(`${file.name}: use a GPX, TCX or FIT file.`);
}
