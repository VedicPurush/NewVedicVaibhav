import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AudioPlayer from "@/components/widgets/home/AudioPlayer";
import { AUDIO_TEXTS } from "@/lib/sacred-texts";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(AUDIO_TEXTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const text = AUDIO_TEXTS[slug];
  return { title: text ? `${text.title} | Vedic Vaibhav` : "Vedic Vaibhav" };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const text = AUDIO_TEXTS[slug];
  if (!text) notFound();
  return <AudioPlayer url={text.url} />;
}
