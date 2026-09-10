import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PdfViewer from "@/components/widgets/home/PdfViewer";
import { ROOT_TEXTS } from "@/lib/sacred-texts";

/**
 * Root-level sacred-text reader routes (e.g. /shrimad-bhagavad-geeta-hindi,
 * /mahabharat-hindi, /ramayana-hindi, ...).
 *
 * The params are enumerated via generateStaticParams and dynamicParams is
 * false, so ONLY the 10 legacy slugs resolve here — every other root path
 * 404s from this route and static/other routes always take precedence.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ROOT_TEXTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const text = ROOT_TEXTS[slug];
  return { title: text ? `${text.title} | Vedic Vaibhav` : "Vedic Vaibhav" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const text = ROOT_TEXTS[slug];
  if (!text) notFound();
  return <PdfViewer url={text.url} />;
}
