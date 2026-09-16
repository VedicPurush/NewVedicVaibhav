import ReactDOM from "react-dom";
import PitruPujaPage from "@/components/pages/services/puja/pitru-puja/PitruPujaPage";
import { PITRU_PUJA_ID } from "@/components/pages/services/puja/pitru-puja/constants";
import { loadPitruPuja } from "@/lib/server/pitruPujaData";

/**
 * Regenerate the prerendered page every 5 minutes — same reasoning as the
 * homepage: the puja document is fetched on the server at most once per window
 * and reused for every visitor in it, so server-side fetching costs nothing per
 * request while still reflecting CMS edits within minutes.
 */
export const revalidate = 300;

export default async function Page() {
  const pitruPuja = await loadPitruPuja(PITRU_PUJA_ID);

  // The banner is the LCP element. Rendering it in the HTML already removes the
  // hydrate → fetch → discover chain, and this preload lets the browser start
  // the download while it is still parsing <head>, before it reaches the <img>.
  const bannerImage = pitruPuja?.bannerImages?.[0];
  if (bannerImage) {
    ReactDOM.preload(bannerImage, { as: "image", fetchPriority: "high" });
  }

  return <PitruPujaPage serverPuja={pitruPuja} />;
}
