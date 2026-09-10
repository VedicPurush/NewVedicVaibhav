import type { Metadata } from "next";
import IndividualMandir from "@/components/pages/mandir/IndividualMandir";
import { fetchMandirById } from "@/lib/api/mandir.api";
import { buildDetailSlug, extractIdFromSlug } from "@/lib/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  // `id` is really a "name-id" slug (see lib/slug.ts) — recover the real Mongo
  // id for the lookup, but keep the ORIGINAL slug for the canonical/OG URLs
  // below so they point at the pretty URL rather than collapsing to a bare id.
  const { id: slugParam } = await params;
  const id = extractIdFromSlug(slugParam);
  let mandir: any = null;
  try {
    mandir = await fetchMandirById(id);
  } catch {
    mandir = null;
  }

  const mandirName = mandir?.nameEnglish || mandir?.nameHindi || "Sacred Temple";
  const mandirCity = mandir?.city || "India";
  const mandirDesc = `Book personalized puja at ${mandirName}, ${mandirCity}. Puja performed in your name & gotra by expert priests with live video and prasad delivery.`;
  const img = mandir?.images?.[0];
  const mandirImage =
    typeof img === "string"
      ? img
      : img?.location ||
        img?.url ||
        "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/og-image.jpg";

  // The AUTHORITATIVE slug, regenerated from the current name — not whatever
  // the visitor happened to arrive with. A canonical tag exists precisely so
  // every variant (a bare legacy id, a stale name if the mandir was renamed,
  // the current slug) declares the SAME one true URL to search engines.
  const canonicalSlug = mandir ? buildDetailSlug(mandirName, id) : slugParam;

  return {
    title: `${mandirName} Puja Booking — Online Pooja at ${mandirCity} Temple | Vedic Vaibhav`,
    description: mandirDesc,
    alternates: { canonical: `https://vedicvaibhav.com/mandir/${canonicalSlug}` },
    openGraph: {
      title: `${mandirName} — Book Online Pooja | Vedic Vaibhav`,
      description: mandirDesc,
      type: "website",
      url: `https://vedicvaibhav.com/mandir/${canonicalSlug}`,
      images: [{ url: mandirImage }],
    },
  };
}

export default function Page() {
  return <IndividualMandir />;
}
