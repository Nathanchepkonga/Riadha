/** URL slug from a display name: lowercase ASCII words joined by hyphens. */
export function slugify(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "riadha"
  );
}

/** First free slug: `base`, then `base-2`, `base-3`… `taken` checks the database. */
export async function uniqueSlug(name: string, taken: (slug: string) => Promise<boolean>) {
  const base = slugify(name);
  for (let i = 1; i < 50; i++) {
    const candidate = i === 1 ? base : `${base}-${i}`;
    if (!(await taken(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Only http(s) URLs are safe to link to or redirect to. Returns the normalised URL or null. */
export function safeHttpUrl(raw: string | null | undefined) {
  if (!raw) return null;
  const value = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
