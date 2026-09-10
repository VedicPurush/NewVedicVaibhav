import { api } from "@/lib/api";

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

export interface PitruPuja {
  _id: string;
  pujaId: string;
  pujaName: string;
  subName: string;
  bannerImages: string[];
  festiveTags: string[];
  reason: string;
  mandirDate: string[];
  about: string;
  benefits: string[];
  aboutMandir: string;
  packages: PitruPujaPackage[];
  isActive: boolean;
  festiveName: string;
  mandirName: string;
  mandirPlace: string;
  featureCards: PitruPujaFeatureCard[];
}

export const fetchPitruPujaByPujaId = async (pujaId: string): Promise<PitruPuja | null> => {
  const res = await api.get(`/fetch-pitru-puja/${pujaId}`);
  return res.data?.pitruPuja ?? null;
};
