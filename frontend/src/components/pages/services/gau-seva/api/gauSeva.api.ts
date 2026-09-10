import { api } from "@/lib/api";
import { orderRequestFields } from "@/lib/currency";
import { PACKAGES, TESTIMONIALS } from "../data/gauSevaData";

const getMetaHeaders = (): Record<string, string> => {
  const getCookie = (name: string) => {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  };
  const fbp = getCookie('_fbp');
  const cookieFbc = getCookie('_fbc');
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  const fbc = cookieFbc || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : '');
  const headers: Record<string, string> = { 'x-event-source-url': window.location.href };
  if (fbp) headers['x-fbp'] = fbp;
  if (fbc) headers['x-fbc'] = fbc;
  return headers;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type OccasionType = "none" | "birthday" | "anniversary" | "newborn" | "pitru_paksha";

export interface OccasionDetails {
  personName?: string;
  partnerName?: string;
  celebrationDate?: string;
  newbornName?: string;
  pitruName?: string;
  pitruRelation?: string;
}

export interface CreateGauSevaOrderPayload {
  packageId: string;
  packageName: string;
  packagePrice: number;
  quantity: number;
  devoteeName: string;
  whatsapp: string;
  email?: string;
  gotra?: string;
  occasionType?: OccasionType;
  occasionDetails?: OccasionDetails;
  occasionPremium?: number;
  tag?: string;
  specialMessage?: string;
  vv_utm?: Record<string, string>;
}

export interface CreateGauSevaOrderResponse {
  bookingId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  /** What the card was actually billed, in `currency` — undefined on INR orders. */
  chargedAmount?: number;
  key: string;
  packageName: string;
  devoteeName: string;
  whatsapp: string;
}

export interface VerifyGauSevaPaymentPayload {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface GauSevaBooking {
  _id: string;
  bookingId: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  quantity: number;
  totalAmount: number;
  devoteeName: string;
  whatsapp: string;
  email?: string;
  gotra?: string;
  occasionType?: OccasionType;
  occasionDetails?: OccasionDetails;
  occasionPremium?: number;
  tag?: string;
  specialMessage?: string;
  sevaDate?: string;
  deliveryStatus?: "pending" | "delivered";
  deliveredAt?: string;
  paymentStatus: "created" | "paid" | "failed";
  bookingStatus: "initiated" | "confirmed" | "cancelled";
  razorpayPaymentId?: string;
  paidAt?: string;
  createdAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

export const createGauSevaOrderApi = async (
  payload: CreateGauSevaOrderPayload
): Promise<CreateGauSevaOrderResponse> => {
  const { data } = await api.post(`/gau-seva/create-razorpay-order`, {
    ...payload,
    /**
     * Presentment request only: which currency to bill in, the market, and the
     * dial code the server normalises the phone with. Never an amount — the
     * catalog price stays the India list price and the server applies the
     * foreign markup, so it can only ever be applied once.
     */
    ...orderRequestFields(),
  });
  return data;
};

export const verifyGauSevaPaymentApi = async (
  payload: VerifyGauSevaPaymentPayload
) => {
  const { data } = await api.post(
    `/gau-seva/verify-razorpay-payment`,
    payload,
    { headers: getMetaHeaders() }
  );
  return data;
};

export const fetchUserGauSevaBookingsApi = async (
  phone: string
): Promise<GauSevaBooking[]> => {
  const { data } = await api.get(`/user/${phone}/gau-seva-bookings`);
  if (data.success && Array.isArray(data.bookings)) return data.bookings;
  return [];
};

// ─── Queries (Static for now) ──────────────────────────────────────────────────

export const fetchGauSevaPackages = async () => {
  // Simulate API delay for consistency if desired
  return PACKAGES;
};

export const fetchGauSevaReviews = async (page = 1, limit = 6) => {
  const start = (page - 1) * limit;
  const end = start + limit;
  return {
    reviews: TESTIMONIALS.slice(start, end),
    total: TESTIMONIALS.length,
    hasMore: end < TESTIMONIALS.length,
  };
};
