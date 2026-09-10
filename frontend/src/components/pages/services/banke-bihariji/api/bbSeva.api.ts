import { api } from "@/lib/api";
import { orderRequestFields } from "@/lib/currency";

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

export interface BBSevaOrderPayload {
  packageId: string;
  name: string;
  mobile: string;
  email?: string;
  gotra?: string;
  startDate?: string;
  sankalp?: string;
  familyMembers?: string[];
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  discountedAmount?: number;
  vv_utm?: any;
}

export interface BBSevaOrderResponse {
  orderID: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  /** What the card was actually billed, in `currency` — undefined on INR orders. */
  chargedAmount?: number;
  key: string;
}

export const initiateBBSevaApi = async (
  payload: BBSevaOrderPayload
): Promise<BBSevaOrderResponse> => {
  const { data } = await api.post<BBSevaOrderResponse>(`/bb-seva/initiate`, {
    ...payload,
    /**
     * Presentment request only: which currency to bill in, the market, and the
     * dial code the server normalises the phone with. Never an amount — the
     * package price stays the India list price and the server applies the
     * foreign markup, so it can only ever be applied once.
     */
    ...orderRequestFields(),
  });
  return data;
};

export const verifyBBSevaPaymentApi = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderID: string;
}) => {
  const { data } = await api.post(`/bb-seva/verify-payment`, payload, {
    headers: getMetaHeaders(),
  });
  return data;
};

export interface BBSevaReview {
  name: string;
  location?: string;
  review: string;
  rating: number;
  packageName?: string;
}

export const fetchBBSevaReviews = async (
  page = 1,
  limit = 10
): Promise<{ reviews: BBSevaReview[]; total: number }> => {
  try {
    const { data } = await api.get(`/bb-seva/reviews`, {
      params: { page, limit },
    });
    if (data?.success && Array.isArray(data.data)) {
      const formattedReviews = data.data.filter(
        (r: BBSevaReview) => r.name && r.review && r.rating >= 1
      );
      return { reviews: formattedReviews, total: data.total || 0 };
    }
    return { reviews: [], total: 0 };
  } catch (err) {
    console.error("Error fetching BB Seva reviews:", err);
    return { reviews: [], total: 0 };
  }
};
