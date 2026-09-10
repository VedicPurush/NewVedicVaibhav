import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PdfViewer from "@/components/widgets/home/PdfViewer";
import { VED_TEXTS } from "@/lib/sacred-texts";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(VED_TEXTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const text = VED_TEXTS[slug];
  return { title: text ? `${text.title} | Vedic Vaibhav` : "Vedic Vaibhav" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const text = VED_TEXTS[slug];
  if (!text) notFound();
  return <PdfViewer url={text.url} />;
}
