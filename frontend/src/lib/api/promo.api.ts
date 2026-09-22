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
  /** Set in the admin: only a devotee with no earlier paid booking may use it. */
  firstOrderOnly?: boolean;
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
 *
 * `phone` is the devotee's WhatsApp number. Coupons restricted to first-time
 * devotees are rejected without it, so pass it wherever the checkout has it —
 * the server decides, the browser never guesses who is eligible.
 */
export const validatePromo = async (
  code: string,
  orderValue: number,
  phone?: string,
): Promise<AppliedPromo> => {
  const res = await api.post("/validate-promo", { code, orderValue, ...(phone ? { phone } : {}) });
  const { promoName, discountAmount, finalAmount } = res.data;
  return { promoName, discountAmount, finalAmount };
};
