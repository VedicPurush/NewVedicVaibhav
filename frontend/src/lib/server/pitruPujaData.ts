import { fetchPitruPujaByPujaId, type PitruPuja } from "@/lib/api/pitruPuja.api";

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
