"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { issueOtp, verifyOtp } from "@/lib/auth/otp";
import { normalizePhone } from "@/lib/auth/phone";
import { actionUser, createSession, destroySession } from "@/lib/auth/session";
import { otpDevMode, sendSms } from "@/lib/auth/sms";

export type OtpState =
  | { step: "phone"; error?: string }
  | { step: "code"; phone: string; devCode?: string; error?: string };

function adminPhones() {
  return (process.env.ADMIN_PHONES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
}

export async function requestOtp(_prev: OtpState, form: FormData): Promise<OtpState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  if (!phone) return { step: "phone", error: "Enter a valid phone number, e.g. 0712 345 678." };
  const issued = await issueOtp(phone);
  if (!issued.ok) return { step: "code", phone, error: issued.error };
  if (otpDevMode()) return { step: "code", phone, devCode: issued.code };
  try {
    await sendSms(phone, `Your Riadha code is ${issued.code}. It expires in 5 minutes.`);
  } catch {
    return { step: "phone", error: "We couldn't send the SMS. Try again in a moment." };
  }
  return { step: "code", phone };
}

export async function confirmOtp(_prev: OtpState, form: FormData): Promise<OtpState> {
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!phone) return { step: "phone", error: "Enter your phone number again." };
  if (code.length !== 6) return { step: "code", phone, error: "Enter the 6-digit code." };

  const result = await verifyOtp(phone, code);
  if (!result.ok) return { step: "code", phone, error: result.error };

  let [user] = await db.select().from(users).where(eq(users.phone, phone));
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        phone,
        handle: `member${Math.floor(100000 + Math.random() * 900000)}`,
        displayName: "New member",
        isAdmin: adminPhones().includes(phone),
      })
      .returning();
  } else if (!user.isAdmin && adminPhones().includes(phone)) {
    await db.update(users).set({ isAdmin: true }).where(eq(users.id, user.id));
  }
  await createSession(user.id);
  const next = safeNext(form.get("next"));
  if (!user.onboarded) redirect(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
  redirect(next ?? "/feed");
}

/** Only same-site relative paths are allowed as post-login destinations. */
function safeNext(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

export async function logout() {
  await destroySession();
  redirect("/");
}

const HANDLE = /^[a-z0-9_]{3,20}$/;

const onboardingSchema = z.object({
  displayName: z.string().trim().min(2, "Add your name.").max(40),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(HANDLE, "Handle: 3–20 letters, numbers or underscores."),
  role: z.enum(["fan", "athlete", "club", "scout"]),
  kplClubId: z.coerce.number().int().positive().optional().or(z.literal("").transform(() => undefined)),
  sport: z.string().trim().max(40).optional(),
  county: z.string().trim().max(40).optional(),
  dateOfBirth: z.string().optional(),
});

export async function completeOnboarding(_prev: { error?: string } | undefined, form: FormData) {
  const user = await actionUser();
  const parsed = onboardingSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, d.handle));
  if (taken && taken.id !== user.id) return { error: `@${d.handle} is taken. Try another.` };

  let dateOfBirth: string | null = null;
  if (d.role === "athlete") {
    if (!d.dateOfBirth || Number.isNaN(Date.parse(d.dateOfBirth))) return { error: "Athletes need a date of birth (it keeps under-18s safe)." };
    dateOfBirth = d.dateOfBirth;
  }

  await db
    .update(users)
    .set({
      displayName: d.displayName,
      handle: d.handle,
      role: d.role,
      kplClubId: d.kplClubId ?? null,
      sport: d.sport || null,
      county: d.county || null,
      dateOfBirth,
      tagline: d.role === "athlete" && d.sport ? `I'm more than a ${d.sport.toLowerCase()} player.` : null,
      onboarded: true,
    })
    .where(eq(users.id, user.id));

  redirect(safeNext(form.get("next")) ?? (d.role === "fan" ? "/fantasy" : d.role === "scout" ? "/discover" : "/me"));
}
