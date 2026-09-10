import type { Metadata } from "next";
import ChalisaPage from "@/components/pages/explore/Chalisapage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chalisaid: string }>;
}): Promise<Metadata> {
  const { chalisaid } = await params;
  // The URL segment carries the chalisa's English name (the record id itself
  // travels via sessionStorage, mirroring the old location.state behaviour).
  let chalisaTitle = "Chalisa";
  try {
    chalisaTitle = decodeURIComponent(chalisaid) || "Chalisa";
  } catch {
    chalisaTitle = "Chalisa";
  }
  const chalisaDesc = `Read ${chalisaTitle} lyrics in Hindi and English. Devotional chalisa from Vedic Vaibhav.`;

  return {
    title: `${chalisaTitle} Lyrics — Chalisa in Hindi & English | Vedic Vaibhav`,
    description: chalisaDesc,
    alternates: { canonical: "https://vedicvaibhav.com/chalisa" },
    openGraph: {
      title: `${chalisaTitle} — Chalisa Lyrics | Vedic Vaibhav`,
      description: chalisaDesc,
      type: "article",
    },
  };
}

export default function Page() {
  return <ChalisaPage />;
}
