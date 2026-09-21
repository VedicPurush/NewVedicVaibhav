import ReactDOM from "react-dom";
import { notFound } from "next/navigation";
import PitruPujaPage from "@/components/pages/services/puja/pitru-puja/PitruPujaPage";
import { loadPitruPujas, lookupPitruPuja } from "@/lib/server/pitruPujaData";

/**
 * Regenerate the prerendered page every 5 minutes — same reasoning as the
 * homepage: the puja document is fetched on the server at most once per window
 * and reused for every visitor in it, so server-side fetching costs nothing per
 * request while still reflecting CMS edits within minutes.
 */
export const revalidate = 300;

/**
 * Prerender every puja that exists at build time. `dynamicParams` stays at its
 * default, so a puja added afterwards is rendered on demand and then cached
 * rather than 404ing until the next build.
 */
export async function generateStaticParams() {
  const pujas = await loadPitruPujas();
  return pujas.map((puja) => ({ pujaId: puja.pujaId }));
}

export default async function Page({ params }: { params: Promise<{ pujaId: string }> }) {
  const { pujaId } = await params;
  const { puja, missing } = await lookupPitruPuja(pujaId);

  // Renders the 404 page. Note the STATUS is still 200: there is a `loading.tsx`
  // above this route, so the shell — and with it the status line — has already
  // been flushed by the time this runs. Measured: removing that boundary makes
  // this a real 404. Every other data-driven route here behaves the same way.
  if (missing) notFound();

  // `puja` can still be null when the API was unreachable. That is NOT a 404 —
  // the page renders and its client query retries in the browser, which is how
  // this route behaved before.
  const bannerImage = puja?.bannerImages?.[0];
  if (bannerImage) {
    ReactDOM.preload(bannerImage, { as: "image", fetchPriority: "high" });
  }

  return <PitruPujaPage serverPuja={puja} pujaId={pujaId} />;
}
