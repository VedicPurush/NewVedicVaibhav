import type { Metadata } from "next";
import { redirect } from "next/navigation";
import NewChadhavaDetailPage from "@/components/pages/services/chadhava/NewChadhavaDetailPage";
import { fetchNewChadhavaById } from "@/lib/api/newChadhava.api";
import { buildDetailSlug, extractIdFromSlug } from "@/lib/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: slugParam } = await params;
  const id = extractIdFromSlug(slugParam);
  let chadhava: any = null;
  try {
    chadhava = await fetchNewChadhavaById(id);
  } catch {
    chadhava = null;
  }

  const chadhavaName = chadhava?.chadhavaName || "Chadhava Seva";
  const mandirName = chadhava?.selectedMandirs?.[0]?.nameEnglish || "Sacred Temple";
  const description = `Offer ${chadhavaName} at ${mandirName} online. Chadhava is offered in your name & gotra, with the offering video sent on WhatsApp.`;
  const image =
    chadhava?.chadhavaInnerImages?.[0]?.location ||
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/og-image.jpg";
  // Canonical slug is rebuilt from the current name — see app/mandir/[id]/page.tsx.
  const canonicalSlug = chadhava ? buildDetailSlug(chadhavaName, id) : slugParam;

  return {
    title: `${chadhavaName} — ${mandirName} | Vedic Vaibhav`,
    description,
    alternates: { canonical: `https://vedicvaibhav.com/newchadhavapage/detail/${canonicalSlug}` },
    openGraph: {
      title: `${chadhavaName} | Vedic Vaibhav`,
      description,
      type: "website",
      url: `https://vedicvaibhav.com/newchadhavapage/detail/${canonicalSlug}`,
      images: [{ url: image }],
    },
  };
}

// Old SPA logic (RedirectNewChadhavaDetail): this one chadhava id is served by the
// modified detail page at /chadhava/detail/:id; every other id keeps the legacy page.
//
// `id` here is really a "name-id" slug (see lib/slug.ts) — extract the real
// Mongo id to compare against the hardcoded target, but forward the ORIGINAL
// param on redirect so the name stays in the URL rather than collapsing back
// to a bare id.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (extractIdFromSlug(id) === "69b8f83af1b6b394676700e0") {
    redirect(`/chadhava/detail/${id}`);
  }
  return <NewChadhavaDetailPage />;
}
