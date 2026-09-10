/**
 * DigitalOcean Spaces serves every object from two hostnames:
 *
 *   https://<bucket>.<region>.digitaloceanspaces.com/...      ← origin bucket
 *   https://<bucket>.<region>.cdn.digitaloceanspaces.com/...  ← CDN edge
 *
 * Whatever uploads media stores the *origin* URL, so almost all imagery on the
 * site is fetched straight from the bucket instead of the edge. Measured on the
 * homepage hero banner: 0.45s from the origin vs 0.22s from the CDN — the same
 * bytes, twice as slow, with no edge caching.
 *
 * Rewriting on read fixes every record already in the database. The uploader
 * should be corrected too, but that only helps future uploads.
 */

const SPACES_ORIGIN = /^(https?:\/\/[^/]+?)\.([a-z0-9-]+)\.digitaloceanspaces\.com/i;

export const toCdnUrl = (url?: string | null): string => {
  const raw = (url || "").trim();
  if (!raw) return "";

  // Already on the edge, or not a Spaces URL at all.
  if (raw.includes(".cdn.digitaloceanspaces.com")) return raw;

  return raw.replace(SPACES_ORIGIN, (_match, prefix: string, region: string) =>
    `${prefix}.${region}.cdn.digitaloceanspaces.com`,
  );
};

/** Rewrites every Spaces URL found in a value, walking arrays and objects. */
export const withCdnUrls = <T>(value: T): T => {
  if (typeof value === "string") {
    return (value.includes("digitaloceanspaces.com") ? toCdnUrl(value) : value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => withCdnUrls(entry)) as unknown as T;
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = withCdnUrls(entry);
    }
    return out as unknown as T;
  }

  return value;
};
