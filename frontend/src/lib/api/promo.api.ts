import { api } from "@/lib/api";

export type PromoCode = {
  _id: string;
  promoName: string;
  discountAmount: number;
  startRange: number;
  description: string;
  startDate: string;
  expiryDate: string;
  promoType: string;
  isActive: boolean;
  isAppOnly: boolean;
};

export const fetchVedicPromos = async (): Promise<PromoCode[]> => {
  const res = await api.get("/fetch-promo-vedic");
  return res.data; // adjust if your backend wraps {data: ...}
};
