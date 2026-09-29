/**
 * Mandir records are filled in by hand, and an unknown place is usually typed as
 * a placeholder — "N/A", "-", "null" — rather than left blank. A placeholder is
 * not a place, so it must never be rendered as one, and it must not satisfy a
 * `state || city` fallback either: "N/A" is truthy, so without this the fallback
 * stops at the placeholder and never reaches the value that was actually filled.
 *
 * Returns the value worth showing, or "" when there is nothing worth showing.
 */
const PLACEHOLDER =
  /^(n\.?\/?a\.?|na|nil|null|none|undefined|not\s*(applicable|available|specified)|[-–—.]+)$/i;

export const displayPlace = (value?: string | null): string => {
  const trimmed = String(value ?? "").trim();
  return !trimmed || PLACEHOLDER.test(trimmed) ? "" : trimmed;
};
