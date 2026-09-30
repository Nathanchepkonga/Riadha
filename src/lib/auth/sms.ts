import "server-only";

/** True when codes should be shown on screen instead of sent (local dev, or no SMS provider configured). */
export function otpDevMode() {
  return process.env.OTP_DEV_MODE === "true" || !process.env.AT_API_KEY || !process.env.AT_USERNAME;
}

/** Sends an SMS through Africa's Talking. Username "sandbox" uses their sandbox API. */
export async function sendSms(to: string, message: string) {
  const username = process.env.AT_USERNAME!;
  const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
  const res = await fetch(`https://${host}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey: process.env.AT_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`SMS failed (${res.status})`);
}
