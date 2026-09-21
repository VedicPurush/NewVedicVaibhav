import ReactDOM from "react-dom";
import { redirect } from "next/navigation";
import PitruPujaPage from "@/components/pages/services/puja/pitru-puja/PitruPujaPage";
import { getNextPitruPujaDate } from "@/lib/api/pitruPuja.api";
import { loadPitruPujas } from "@/lib/server/pitruPujaData";

/**
 * This path used to BE the landing page, back when a single hardcoded puja id
 * was the only one ever fetched. Each puja now also has its own route under it.
 *
 * It renders the soonest upcoming puja rather than redirecting to it. A
 * `redirect()` here cannot become an HTTP 307: the layout above has already
 * begun streaming by the time it runs, so Next falls back to a one-second meta
 * refresh — a blank page and a hop for traffic that ads send straight here.
 * Rendering keeps this URL behaving exactly as it did before the split.
 */
export const revalidate = 300;

export default async function Page() {
  const pujas = await loadPitruPujas();

  const soonest = pujas
    .map((puja) => {
      const date = getNextPitruPujaDate(puja.mandirDate);
      return { puja, time: date ? new Date(date).getTime() : NaN };
    })
    .filter(({ time }) => Number.isFinite(time))
    .sort((a, b) => a.time - b.time)[0]?.puja;

  // Nothing scheduled, or the API was unreachable. The puja listing is the
  // closest useful page — better than a 404 on a URL that carries ad traffic.
  if (!soonest) redirect("/services/puja");

  // The banner is the LCP element; start it downloading during <head> parsing.
  const bannerImage = soonest.bannerImages?.[0];
  if (bannerImage) {
    ReactDOM.preload(bannerImage, { as: "image", fetchPriority: "high" });
  }

  return <PitruPujaPage serverPuja={soonest} pujaId={soonest.pujaId} />;
}
