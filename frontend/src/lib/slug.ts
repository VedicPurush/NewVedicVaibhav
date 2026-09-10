/**
 * "Name + ID" URL segments — shows the item's name in the address bar while
 * keeping the real Mongo id available for lookups.
 *
 *   buildDetailSlug("Shri Badrinath Dham Chadhava", "69b92695f1b6b39467670291")
 *     -> "shri-badrinath-dham-chadhava-69b92695f1b6b39467670291"
 *
 * Deliberately NOT a pure-slug scheme (name only, no id): that would need a
 * unique `slug` field added to every content type, a migration to backfill
 * one onto every existing record, collision handling for two items sharing a
 * name, and a slug-based lookup added to each backend endpoint — and it would
 * break every link anyone has already bookmarked or shared. Keeping the id
 * suffix means NO backend change is needed at all: every existing route still
 * looks the record up by id exactly as before, and every old bare-id link
 * (`/mandir/507f191e810c19729de860ea`) keeps resolving forever, because
 * extractIdFromSlug() below reads the id back out of whichever shape it finds.
 */

/** Mongo ObjectIds are always exactly 24 hex characters. */
const OBJECT_ID_RE = /[a-f0-9]{24}/i;

/** Lowercase, ASCII, hyphen-separated. Empty/unslugifiable input -> "". */
export function slugify(text: string | undefined | null): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents so "café" -> "cafe"
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) // keep URLs sane for very long titles
    .replace(/-+$/g, ""); // the slice can leave a trailing hyphen
}

/**
 * Build the URL segment for a detail page: `${slugified name}-${id}`.
 *
 * Falls back to the bare id when the name doesn't produce a usable slug
 * (empty, or entirely punctuation/non-Latin) — never throws, never omits
 * the id, since the id is what every lookup actually depends on.
 */
export function buildDetailSlug(name: string | undefined | null, id: string): string {
  const base = slugify(name);
  return base ? `${base}-${id}` : id;
}

/**
 * Recover the real Mongo id from a "name-id" URL segment.
 *
 * Handles every shape that can land here:
 *   - the new form: "shri-badrinath-dham-chadhava-69b92695f1b6b39467670291"
 *   - a bare legacy id, unchanged: "69b92695f1b6b39467670291"
 *   - anything else (a stale/hand-edited URL) falls back to the input as-is,
 *     so a bad param produces a clean "not found" from the API rather than a
 *     confusing crash here.
 */
export function extractIdFromSlug(param: string | undefined | null): string {
  const s = String(param ?? "");
  const match = s.match(new RegExp(`(${OBJECT_ID_RE.source})$`, "i"));
  return match ? match[1] : s;
}
