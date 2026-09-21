/**
 * Base path of the Pitru Dosh Shanti puja pages.
 *
 * The landing page is one route per puja — `${BASE}/${pujaId}` — because the
 * collection holds several pujas. A bare visit to this path renders the
 * soonest upcoming one, so links published before the split still work.
 */
export const PITRU_PUJA_BASE_PATH = "/services/puja/pitru-dosh-shanti-puja";

/** Landing page for one puja. `pujaId` is the document's own unique id. */
export const pitruPujaHref = (pujaId: string) =>
  `${PITRU_PUJA_BASE_PATH}/${encodeURIComponent(pujaId)}`;
