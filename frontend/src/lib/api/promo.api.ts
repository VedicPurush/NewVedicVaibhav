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

export type AppliedPromo = {
  promoName: string;
  /** Discount actually granted for this order value, INR. */
  discountAmount: number;
  /** Order value after the discount, INR. */
  finalAmount: number;
};

/**
 * Server-side preview of a coupon against an INDIA LIST order value.
 * Rejects (400) with a user-facing `message` when the code cannot be used.
 */
export const validatePromo = async (code: string, orderValue: number): Promise<AppliedPromo> => {
  const res = await api.post("/validate-promo", { code, orderValue });
  const { promoName, discountAmount, finalAmount } = res.data;
  return { promoName, discountAmount, finalAmount };
};
