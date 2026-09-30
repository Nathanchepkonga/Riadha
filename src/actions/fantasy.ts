"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { entryPicks, fantasyEntries, leagueMembers, leagues, players, transfers } from "@/db/schema";
import { actionUser } from "@/lib/auth/session";
import { ensurePicksFor, getNextGameweek } from "@/lib/fantasy/engine";
import { defaultLineup, validateSquad, validateXI, type Pos } from "@/lib/fantasy/rules";

type Result = { error?: string };

async function loadSquad(ids: number[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: players.id, position: players.position, clubId: players.clubId, price: players.price, available: players.available })
    .from(players)
    .where(inArray(players.id, ids));
}

const idsSchema = z.array(z.number().int().positive()).length(15);

export async function createEntry(teamName: string, playerIds: number[], joinCode?: string): Promise<Result> {
  const user = await actionUser();
  const name = teamName.trim();
  if (name.length < 3 || name.length > 30) return { error: "Team name: 3–30 characters." };
  const ids = idsSchema.safeParse(playerIds);
  if (!ids.success) return { error: "Pick 15 players." };

  const next = await getNextGameweek(db);
  if (!next) return { error: "The season is over. See you next season!" };
  const squad = await loadSquad(ids.data);
  if (squad.length !== 15 || squad.some((p) => !p.available)) return { error: "Some players are no longer available." };
  const invalid = validateSquad(squad);
  if (invalid) return { error: invalid };

  const [existing] = await db.select({ id: fantasyEntries.id }).from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (existing) return { error: "You already have a team." };

  await db.transaction(async (tx) => {
    const [entry] = await tx.insert(fantasyEntries).values({ userId: user.id, teamName: name, startGameweekId: next.id }).returning();
    await tx.insert(entryPicks).values(defaultLineup(squad).map((p) => ({ ...p, entryId: entry.id, gameweekId: next.id })));
    // Everyone starts in the public launch league.
    const codes = ["RIADHA", ...(joinCode ? [joinCode.toUpperCase()] : [])];
    const toJoin = await tx.select({ id: leagues.id }).from(leagues).where(inArray(leagues.code, codes));
    if (toJoin.length) {
      await tx.insert(leagueMembers).values(toJoin.map((l) => ({ leagueId: l.id, entryId: entry.id }))).onConflictDoNothing();
    }
  });
  revalidatePath("/fantasy");
  redirect("/fantasy?welcome=1");
}

/** Replaces players like-for-like: each incoming player takes the outgoing player's slot and armband. */
export async function makeTransfers(playerIds: number[]): Promise<Result> {
  const user = await actionUser();
  const ids = idsSchema.safeParse(playerIds);
  if (!ids.success) return { error: "Your squad needs 15 players." };
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (!entry) return { error: "Create your team first." };
  const next = await getNextGameweek(db);
  if (!next) return { error: "Transfers are closed for the season." };

  const current = await ensurePicksFor(db, entry.id, next.id);
  const squad = await loadSquad(ids.data);
  if (squad.length !== 15) return { error: "Some players could not be found." };
  const invalid = validateSquad(squad);
  if (invalid) return { error: invalid };

  const pos = new Map<number, Pos>((await loadSquad(current.map((p) => p.playerId))).map((p) => [p.id, p.position]));
  const newIds = new Set(ids.data);
  const oldIds = new Set(current.map((p) => p.playerId));
  const outs = current.filter((p) => !newIds.has(p.playerId));
  const ins = squad.filter((p) => !oldIds.has(p.id));
  if (outs.length === 0) return { error: "You haven't changed any players." };
  if (ins.some((p) => !p.available)) return { error: "Some players are no longer available." };

  const pool = new Map<Pos, typeof ins>();
  for (const p of ins) pool.set(p.position, [...(pool.get(p.position) ?? []), p]);
  const replaced = new Map<number, number>(); // out playerId -> in playerId
  for (const o of outs) {
    const incoming = pool.get(pos.get(o.playerId)!)?.shift();
    if (!incoming) return { error: "Transfers must be like-for-like (same position)." };
    replaced.set(o.playerId, incoming.id);
  }

  const nextPicks = current.map((p) => ({ ...p, playerId: replaced.get(p.playerId) ?? p.playerId }));
  await db.transaction(async (tx) => {
    await tx.delete(entryPicks).where(and(eq(entryPicks.entryId, entry.id), eq(entryPicks.gameweekId, next.id)));
    await tx.insert(entryPicks).values(nextPicks.map((p) => ({ ...p, entryId: entry.id, gameweekId: next.id })));
    await tx.insert(transfers).values(
      [...replaced].map(([outId, inId]) => ({ entryId: entry.id, gameweekId: next.id, playerOutId: outId, playerInId: inId })),
    );
  });
  revalidatePath("/fantasy");
  redirect("/fantasy?transferred=1");
}

const lineupSchema = z
  .array(z.object({ slot: z.number().int().min(1).max(15), playerId: z.number().int(), isCaptain: z.boolean(), isVice: z.boolean() }))
  .length(15);

export async function saveLineup(picks: z.infer<typeof lineupSchema>): Promise<Result & { ok?: boolean }> {
  const user = await actionUser();
  const parsed = lineupSchema.safeParse(picks);
  if (!parsed.success) return { error: "That lineup isn't valid." };
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (!entry) return { error: "Create your team first." };
  const next = await getNextGameweek(db);
  if (!next) return { error: "The season is over." };

  const current = await ensurePicksFor(db, entry.id, next.id);
  const lineup = parsed.data;
  const same = new Set(current.map((p) => p.playerId));
  if (lineup.some((p) => !same.has(p.playerId)) || new Set(lineup.map((p) => p.playerId)).size !== 15 || new Set(lineup.map((p) => p.slot)).size !== 15) {
    return { error: "Your squad changed. Refresh and try again." };
  }
  const pos = new Map((await loadSquad(lineup.map((p) => p.playerId))).map((p) => [p.id, p.position]));
  const starters = lineup.filter((p) => p.slot <= 11);
  const xiError = validateXI(starters.map((p) => pos.get(p.playerId)!));
  if (xiError) return { error: xiError };
  if (pos.get(lineup.find((p) => p.slot === 12)!.playerId) !== "GK") return { error: "The first bench spot is for your goalkeeper." };
  const caps = lineup.filter((p) => p.isCaptain);
  const vices = lineup.filter((p) => p.isVice);
  if (caps.length !== 1 || vices.length !== 1 || caps[0].playerId === vices[0].playerId) return { error: "Pick one captain and a different vice-captain." };
  if (caps[0].slot > 11 || vices[0].slot > 11) return { error: "Your captain and vice must be in the starting XI." };

  await db.transaction(async (tx) => {
    await tx.delete(entryPicks).where(and(eq(entryPicks.entryId, entry.id), eq(entryPicks.gameweekId, next.id)));
    await tx.insert(entryPicks).values(lineup.map((p) => ({ ...p, entryId: entry.id, gameweekId: next.id })));
  });
  revalidatePath("/fantasy");
  return { ok: true };
}

export async function renameTeam(_prev: Result | undefined, form: FormData): Promise<Result> {
  const user = await actionUser();
  const name = String(form.get("teamName") ?? "").trim();
  if (name.length < 3 || name.length > 30) return { error: "Team name: 3–30 characters." };
  await db.update(fantasyEntries).set({ teamName: name }).where(eq(fantasyEntries.userId, user.id));
  revalidatePath("/fantasy");
  return {};
}

/* ───── Leagues ───── */

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

export async function createLeague(_prev: Result | undefined, form: FormData): Promise<Result> {
  const user = await actionUser();
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 3 || name.length > 40) return { error: "League name: 3–40 characters." };
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (!entry) return { error: "Create your fantasy team first." };

  let league;
  for (let i = 0; i < 5 && !league; i++) {
    [league] = await db.insert(leagues).values({ name, code: newCode(), ownerId: user.id }).onConflictDoNothing().returning();
  }
  if (!league) return { error: "Couldn't create the league. Try again." };
  await db.insert(leagueMembers).values({ leagueId: league.id, entryId: entry.id });
  redirect(`/fantasy/leagues/${league.id}?created=1`);
}

export async function joinLeague(_prev: Result | undefined, form: FormData): Promise<Result> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  return joinByCode(code);
}

export async function joinByCode(code: string): Promise<Result> {
  const user = await actionUser();
  const [league] = await db.select().from(leagues).where(eq(leagues.code, code.toUpperCase()));
  if (!league) return { error: "No league with that code. Check it and try again." };
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (!entry) redirect(`/fantasy?join=${league.code}`);
  await db.insert(leagueMembers).values({ leagueId: league.id, entryId: entry.id }).onConflictDoNothing();
  redirect(`/fantasy/leagues/${league.id}`);
}

export async function leaveLeague(leagueId: number) {
  const user = await actionUser();
  const [entry] = await db.select().from(fantasyEntries).where(eq(fantasyEntries.userId, user.id));
  if (entry) await db.delete(leagueMembers).where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.entryId, entry.id)));
  redirect("/fantasy/leagues");
}
