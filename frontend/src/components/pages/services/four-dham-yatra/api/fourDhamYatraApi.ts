import { api } from "@/lib/api";
import { orderRequestFields } from "@/lib/currency";
import type { Active4DhamYatraResponse } from "./types";

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

export const fetchActive4DhamYatraApi = async (): Promise<Active4DhamYatraResponse> => {
  const response = await api.get(`/fetch-active-4dham-yatra`);
  return response.data;
};

export const create4DhamRazorpayOrderApi = async (payload: {
  poojaId: string;
  slotId: string;
  packageName: string;
  devoteeName: string;
  whatsapp: string;
  gotra: string;
  familyMembers: string[];
  address: string;
  city: string;
  state: string;
  pincode: string;
  discountedAmount?: number;
  vv_utm?: any;
}) => {
  const response = await api.post(`/4dham-yatra/create-razorpay-order`, {
    ...payload,
    /**
     * Presentment request only: which currency to bill in, the market, and the
     * dial code the server normalises the phone with. Never an amount — the
     * catalog price stays the India list price and the server applies the
     * foreign markup, so it can only ever be applied once.
     */
    ...orderRequestFields(),
  });
  return response.data;
};

export const verify4DhamRazorpayPaymentApi = async (payload: {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const response = await api.post(`/4dham-yatra/verify-razorpay-payment`, payload, {
    headers: getMetaHeaders(),
  });
  return response.data;
};
