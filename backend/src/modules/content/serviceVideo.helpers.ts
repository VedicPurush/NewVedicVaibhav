import { SERVICE_CHADHAVA, SERVICE_PUJA } from "./serviceVideo.model";

/** What `service` is meant to hold. Anything else found there is an offering's name. */
export const SERVICE_TYPES: readonly string[] = [SERVICE_CHADHAVA, SERVICE_PUJA];

export const isServiceType = (value: string): boolean =>
  SERVICE_TYPES.includes(value.trim().toLowerCase());

/**
 * The raw `service` cell. Also reads `"service "` — with a trailing space —
 * because that key has been written into the collection by hand.
 */
export const rawServiceOf = (doc: object): string => {
  const row = doc as Record<string, unknown>;
  return String(row.service || row["service "] || "").trim();
};

/**
 * Which service a `links` row belongs to — the one definition of it, shared by
 * the API and the migration script.
 *
 * Until 2026-09 the admin tool stored the offering's NAME in `service`
 * ("Shri Krishna Janmashtami Special Chadhava"); rows it writes before its own
 * fix is deployed still do. So, in order:
 *  1. Already a service type → that.
 *  2. This devotee has a chadhava booking with the row's order id → chadhava.
 *     That is proof, whatever the name says.
 *  3. The name mentions a service ("… chadhava", "… puja") → that service.
 *  4. Missing or blank → chadhava: those rows predate every other offering.
 * Anything else is returned lowercased and matches no service filter.
 */
export const classifyService = (raw: string, hasChadhavaBooking: boolean): string => {
  const value = raw.trim().toLowerCase();
  if (isServiceType(value)) return value;
  if (hasChadhavaBooking || !value || value.includes(SERVICE_CHADHAVA)) return SERVICE_CHADHAVA;
  if (value.includes(SERVICE_PUJA) || value.includes("pooja")) return SERVICE_PUJA;
  return value;
};

/**
 * The offering's name: its own field, or — on a row written before that field
 * existed — the name the admin tool put in `service`.
 */
export const serviceNameOf = (doc: { serviceName?: string }, raw: string): string =>
  doc.serviceName?.trim() || (isServiceType(raw) ? "" : raw);
