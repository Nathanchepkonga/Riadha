/** Normalises Kenyan numbers (0712…, 712…, 254712…, +254712…) to E.164. Other E.164 numbers pass through. */
export function normalizePhone(input: string): string | null {
  const raw = input.replace(/[\s\-().]/g, "");
  let digits: string;
  if (/^\+\d{8,15}$/.test(raw)) {
    digits = raw;
  } else if (/^254[17]\d{8}$/.test(raw)) {
    digits = `+${raw}`;
  } else if (/^0[17]\d{8}$/.test(raw)) {
    digits = `+254${raw.slice(1)}`;
  } else if (/^[17]\d{8}$/.test(raw)) {
    digits = `+254${raw}`;
  } else {
    return null;
  }
  if (digits.startsWith("+254") && !/^\+254[17]\d{8}$/.test(digits)) return null;
  return digits;
}

export function maskPhone(phone: string) {
  return phone.length > 7 ? `${phone.slice(0, 7)}•••${phone.slice(-2)}` : phone;
}
