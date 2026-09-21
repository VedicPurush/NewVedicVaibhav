import { fetchAllPitruPujas, fetchPitruPujaByPujaId, type PitruPuja } from "@/lib/api/pitruPuja.api";
import { isNotFoundResponse } from "@/lib/api";

/**
 * Server-side fetch for the Pitru Dosh Shanti Puja landing page.
 *
 * The page used to ship as an empty client shell: the HTML contained only the
 * loading GIF, and the banner — the LCP element — could not even start
 * downloading until the JS bundle had loaded, hydrated, fired the React Query
 * fetch and received the response. That serial chain is what put LCP at ~13s.
 *
 * Fetching here puts the whole document into the first render, so the banner is
 * in the HTML the browser parses.
 *
 * Unlike `loadHomeData` this deliberately does NOT skip the build phase. The
 * route is prerendered, so skipping would bake an empty shell into the artifact
 * and hand the loading GIF to every visitor until the first revalidation — the
 * exact problem this file exists to remove. The try/catch already keeps a
 * failing API from breaking the build; ISR then fills it in at runtime.
 */
export const loadPitruPuja = async (pujaId: string): Promise<PitruPuja | null> => {
  try {
    return await fetchPitruPujaByPujaId(pujaId);
  } catch (error) {
    // Not fatal — the client query fetches it in the browser instead.
    console.error(`[pitruPujaData] server fetch failed for "${pujaId}":`, error);
    return null;
  }
};

/**
 * Every active pitru puja, for the routes that need the whole list: the
 * listing pages, and `generateStaticParams` for the per-puja landing route.
 */
export const loadPitruPujas = async (): Promise<PitruPuja[]> => {
  try {
    return await fetchAllPitruPujas();
  } catch (error) {
    // Same contract as above — the client refetches, and a failure here must
    // not break the build of a route that prerenders from this list.
    console.error("[pitruPujaData] server fetch failed for the pitru puja list:", error);
    return [];
  }
};

export type PitruPujaLookup = {
  puja: PitruPuja | null;
  /** True only when the backend answered 404 for this id. */
  missing: boolean;
};

/**
 * Like `loadPitruPuja`, but says WHY there is no document.
 *
 * `missing` separates "this id does not exist" from "the API was unreachable",
 * so the route can 404 a genuinely unknown puja without 404-ing every puja
 * during an outage. An unreachable API keeps the old behaviour instead: render
 * the page shell and let the client query fill it in.
 */
export const lookupPitruPuja = async (pujaId: string): Promise<PitruPujaLookup> => {
  try {
    const puja = await fetchPitruPujaByPujaId(pujaId);
    return { puja, missing: puja === null };
  } catch (error) {
    if (isNotFoundResponse(error)) return { puja: null, missing: true };
    console.error(`[pitruPujaData] server fetch failed for "${pujaId}":`, error);
    return { puja: null, missing: false };
  }
};
