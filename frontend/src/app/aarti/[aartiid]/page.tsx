import type { Metadata } from "next";
import AartiPage from "@/components/pages/explore/AartiPage";
import { apiUrl } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ aartiid: string }>;
}): Promise<Metadata> {
  const { aartiid } = await params;
  let aarti: any = null;
  try {
    const res = await fetch(apiUrl(`/fetch-library-data-by-id/${aartiid}`));
    if (res.ok) {
      const data = await res.json();
      aarti = data?.library ?? null;
    }
  } catch {
    aarti = null;
  }

  const aartiTitle = aarti?.nameEnglish || aarti?.nameHindi || "Aarti";
  const aartiDesc = `Read and listen to ${aartiTitle} lyrics in Hindi and English. ${aarti?.descriptionEnglish?.slice(0, 100) || "Devotional aarti from Vedic Vaibhav."}`;

  return {
    title: `${aartiTitle} Lyrics — Aarti in Hindi & English | Vedic Vaibhav`,
    description: aartiDesc,
    alternates: { canonical: `https://vedicvaibhav.com/aarti/${aartiid}` },
    openGraph: {
      title: `${aartiTitle} — Aarti Lyrics | Vedic Vaibhav`,
      description: aartiDesc,
      type: "article",
      url: `https://vedicvaibhav.com/aarti/${aartiid}`,
    },
  };
}

export default function Page() {
  return <AartiPage />;
}
