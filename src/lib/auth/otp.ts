import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { otpCodes } from "@/db/schema";

const TTL_MS = 5 * 60 * 1000;
const RESEND_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function hash(phone: string, code: string) {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "").update(`${phone}:${code}`).digest("hex");
}

export async function issueOtp(phone: string) {
  const [recent] = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(eq(otpCodes.phone, phone))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_MS) {
    return { ok: false as const, error: "Please wait 30 seconds before requesting another code." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(otpCodes).values({ phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + TTL_MS) });
  return { ok: true as const, code };
}

export async function verifyOtp(phone: string, code: string) {
  const [row] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false as const, error: "That code has expired. Request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Too many attempts. Request a new code." };

  const expected = Buffer.from(row.codeHash, "hex");
  const actual = Buffer.from(hash(phone, code), "hex");
  if (!timingSafeEqual(expected, actual)) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    return { ok: false as const, error: "Wrong code. Check the SMS and try again." };
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  return { ok: true as const };
}
