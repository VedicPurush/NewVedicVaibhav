import { api } from "@/lib/api";
import { withCdnUrls } from "@/lib/imageUrl";

export interface PitruPujaPackage {
  personCount: number;
  price: number;
  label: string;
  image: string;
}

export interface PitruPujaFeatureCard {
  image?: string;
  title: string;
  description: string;
}

export interface PitruPujaBenefit {
  title: string;
  description: string;
}

export interface PitruPujaFaq {
  question: string;
  answer: string;
}

export interface PitruPuja {
  _id: string;
  pujaId: string;
  pujaName: string;
  subName: string;
  bannerImages: string[];
  /** Listing/home card image (1.85:1). Falls back to the first banner image. */
  cardImage?: string;
  festiveTags: string[];
  reason: string;
  mandirDate: string[];
  about: string;
  /** Plain strings are the legacy shape, rendered as title-only cards. */
  benefits: (string | PitruPujaBenefit)[];
  aboutMandir: string;
  packages: PitruPujaPackage[];
  isActive: boolean;
  festiveName: string;
  mandirName: string;
  mandirPlace: string;
  featureCards: PitruPujaFeatureCard[];
  faqs?: PitruPujaFaq[];
  createdAt?: string;
}

/** Calendar day in IST as YYYY-MM-DD, so "today" means today for the devotee. */
const istDay = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * The puja date to show and book: the earliest one that is today or later (IST).
 * Falls back to the latest date when every date has passed, so the page still
 * has something to display.
 */
export const getNextPitruPujaDate = (dates: string[] = []): string | undefined => {
  const valid = dates
    .map((value) => ({ value, time: new Date(value).getTime() }))
    .filter(({ time }) => !isNaN(time))
    .sort((a, b) => a.time - b.time);
  const today = istDay(new Date());
  return (valid.find(({ time }) => istDay(new Date(time)) >= today) ?? valid.at(-1))?.value;
};

export const fetchPitruPujaByPujaId = async (pujaId: string): Promise<PitruPuja | null> => {
  const res = await api.get(`/fetch-pitru-puja/${pujaId}`);
  // The uploader stores Spaces *origin* URLs, so the banner — this page's LCP
  // element — was being fetched from the bucket rather than the CDN edge. See
  // lib/imageUrl.ts for the measured difference.
  return withCdnUrls(res.data?.pitruPuja ?? null);
};
