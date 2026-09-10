import type { ReactNode } from "react";

export interface DhamData {
  id: string;
  title: string;
  img: string;
}

export interface PackageInclusion {
  dhamName: string;
  details: string;
}

export interface YatraPackage {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  packageImage: string;
  theme: "brown" | "blue" | "red" | "gold";
  isRecommended?: boolean;
  mainInclusions: PackageInclusion[];
  freeInclusions: PackageInclusion[];
}

export interface TimelineStep {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface BenefitData {
  id: string;
  icon: ReactNode | string;
  title: string;
  description?: string;
}

export interface ActiveSlotData {
  id: string;
  slotName: string;
  startDate: string;
  endDate: string;
  bookedCount: number;
  totalSlots: number;
  remainingSlots: number;
}

export interface Active4DhamYatraResponse {
  pooja: {
    poojaDocumentId: string;
    poojaId: string;
    poojaName: string;
    poojaDate: string[];
  };
  activeSlot: ActiveSlotData;
  packages: Omit<YatraPackage, "theme" | "isRecommended">[];
}