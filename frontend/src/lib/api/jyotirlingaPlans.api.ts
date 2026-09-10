import { apiUrl } from "@/lib/api";

export interface IInfoHighlight {
  icon: string;
  description: string;
  _id?: string;
}

export interface IPlanAPI {
  _id: string;
  uiName: string;
  uiNameHindi: string;
  pricePercentage: number;
  description: string;
  planId: "Basic" | "Intermediate" | "Advance";
  yearlyPercentageDiscount: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
  includes: string;
  infoHighlights?: IInfoHighlight[];
  infoSectionImage?: string;
}

export interface JyotirlingaPlan {
  id: string;
  name: string;
  nameHindi: string;
  planId: "Basic" | "Intermediate" | "Advance";
  pricePercentage: number;
  yearlyPercentageDiscount: number;
  popular?: boolean;
  premium?: boolean;
  badge?: string;
  features: string[];
  includes: string[];
  infoHighlights: IInfoHighlight[];
  infoSectionImage?: string;
}

const parseQuillToLines = (jsonString: string): string[] => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.ops || !Array.isArray(parsed.ops)) return [];
    let text = "";
    parsed.ops.forEach((op: { insert?: string }) => {
      if (op.insert) text += op.insert;
    });
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
};

const PLAN_ORDER: Record<string, number> = { Basic: 1, Intermediate: 2, Advance: 3 };

export const fetchJyotirlingaPlans = async (): Promise<JyotirlingaPlan[]> => {
  const response = await fetch(apiUrl("/plans"));
  const data: IPlanAPI[] = await response.json();

  const sortedData = [...data].sort((a, b) => PLAN_ORDER[a.planId] - PLAN_ORDER[b.planId]);

  return sortedData.map((item) => {
    const isPopular = item.planId === "Intermediate";
    const isPremium = item.planId === "Advance";
    return {
      id: item._id,
      name: item.uiName,
      nameHindi: item.uiNameHindi,
      planId: item.planId,
      pricePercentage: item.pricePercentage,
      yearlyPercentageDiscount: item.yearlyPercentageDiscount,
      popular: isPopular,
      premium: isPremium,
      badge: isPopular ? "MOST POPULAR" : isPremium ? "PREMIUM" : undefined,
      features: parseQuillToLines(item.description),
      includes: parseQuillToLines(item.includes),
      infoHighlights: item.infoHighlights ?? [],
      infoSectionImage: item.infoSectionImage,
    };
  });
};
