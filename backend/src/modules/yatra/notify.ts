import axios from "axios";
import type { Request } from "express";
import { env } from "../../config/env";

/**
 * DLT order-confirmation SMS (Fast2SMS template 194832, sender VVORDR) shared by
 * the 4 Dham / Banke Bihari Seva / Gau Seva booking flows. No-op when the API
 * key is not configured; callers wrap it in their own try/catch.
 */
export const sendOrderIdSms = async (mobile: string, orderId: string): Promise<void> => {
  const apiKey = env.fast2sms.apiKey;
  if (!apiKey) return;

  let num = mobile.replace(/\D/g, "");
  if (num.startsWith("91") && num.length === 12) num = num.slice(2);

  await axios.get("https://www.fast2sms.com/dev/bulkV2", {
    params: {
      authorization: apiKey,
      route: "dlt",
      sender_id: "VVORDR",
      message: "194832",
      variables_values: orderId,
      flash: 0,
      numbers: num,
    },
    timeout: 10000,
    headers: { Accept: "application/json" },
  });
};

/** Normalise an Indian mobile number to a 91-prefixed WhatsApp destination. */
export const toWhatsappNumber = (mobile: string): string => {
  let phone = mobile.replace(/\D/g, "");
  if (phone.length === 10) phone = `91${phone}`;
  if (!phone.startsWith("91")) phone = `91${phone}`;
  return phone;
};

export interface ClientMeta {
  clientIp: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  eventSourceUrl: string | null;
}

const headerString = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
};

/** Client attribution captured for Meta CAPI purchase events (IP, UA, fbp/fbc). */
export const extractClientMeta = (req: Request): ClientMeta => ({
  clientIp:
    headerString(req.headers["x-forwarded-for"])?.split(",")[0]?.trim() || req.socket?.remoteAddress || null,
  userAgent: headerString(req.headers["user-agent"]),
  fbp: headerString(req.headers["x-fbp"]),
  fbc: headerString(req.headers["x-fbc"]),
  eventSourceUrl: headerString(req.headers["x-event-source-url"]) || env.metaCapi.defaultEventSourceUrl || null,
});
