import axios from "axios";
import crypto from "node:crypto";
import { env } from "../config/env";

export type MetaActionSource =
  | "website"
  | "app"
  | "physical_store"
  | "chat"
  | "email"
  | "phone_call"
  | "system_generated"
  | "other";

type MetaUserData = {
  em?: string[];
  ph?: string[];
  external_id?: string[];

  // required for website best practice / requirement
  client_ip_address?: string;
  client_user_agent?: string;

  fbc?: string;
  fbp?: string;
};

type MetaContent = {
  id: string;
  quantity: number;
  delivery_category?: "home_delivery" | "in_store";
};

type MetaCustomData = {
  currency: string;
  value: number;
  contents?: MetaContent[];
};

// keep app_data type but we strip it for website events
type MetaAppData = {
  advertiser_tracking_enabled?: 0 | 1;
  application_tracking_enabled?: 0 | 1;
  // NOTE: extinfo belongs here for app events, but we won't send it for website.
  extinfo?: unknown;
};

type MetaEvent = {
  event_name: string;
  /** unix seconds */
  event_time: number;
  event_id?: string;

  action_source: MetaActionSource;
  event_source_url?: string;

  user_data: MetaUserData;
  custom_data?: MetaCustomData;

  app_data?: MetaAppData;
};

export type MetaCapiResponse = {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
};

const sha256Hex = (input: string): string => crypto.createHash("sha256").update(input).digest("hex");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Meta expects phone normalized (digits only, ideally with country code) before hashing.
 * For India: if 10-digit mobile, prefix 91.
 */
const normalizePhone = (phone: string, defaultCountryCode = "91"): string => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10) digits = `${defaultCountryCode}${digits}`;

  return digits;
};

const normalizeActionSource = (input: unknown, fallback: MetaActionSource): MetaActionSource => {
  const v = String(input || "")
    .trim()
    .toLowerCase();
  const known: MetaActionSource[] = [
    "website",
    "app",
    "physical_store",
    "chat",
    "email",
    "phone_call",
    "system_generated",
    "other",
  ];
  return (known as string[]).includes(v) ? (v as MetaActionSource) : fallback;
};

const to01 = (v: unknown, fallback: 0 | 1): 0 | 1 => {
  if (v === 0 || v === "0" || v === false || v === "false") return 0;
  if (v === 1 || v === "1" || v === true || v === "true") return 1;
  return fallback;
};

const buildUserData = (args: {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;

  clientIp?: string | null;
  userAgent?: string | null;

  fbp?: string | null;
  fbc?: string | null;
}): MetaUserData => {
  const user_data: MetaUserData = {};

  if (args.email) {
    user_data.em = [sha256Hex(normalizeEmail(args.email))];
  }

  if (args.phone) {
    const phNorm = normalizePhone(args.phone);
    if (phNorm) user_data.ph = [sha256Hex(phNorm)];
  }

  if (args.externalId) {
    const extNorm = String(args.externalId).trim();
    if (extNorm) user_data.external_id = [sha256Hex(extNorm)];
  }

  // NOT hashed:
  if (args.clientIp) user_data.client_ip_address = args.clientIp;
  if (args.userAgent) user_data.client_user_agent = args.userAgent;
  if (args.fbp) user_data.fbp = args.fbp;
  if (args.fbc) user_data.fbc = args.fbc;

  return user_data;
};

const sanitizeEventForWebsite = (event: MetaEvent): void => {
  // if website, never allow app_data (prevents extinfo-related rejections)
  if (event.action_source === "website") {
    if (event.app_data) delete event.app_data;

    // Meta expects these for website events (event_source_url + client_user_agent).
    const ua = String(event.user_data?.client_user_agent || "").trim();
    const url = String(event.event_source_url || "").trim();

    if (!ua) {
      throw new Error("Meta CAPI: website events require user_data.client_user_agent");
    }
    if (!url) {
      throw new Error("Meta CAPI: website events require event_source_url");
    }
  }
};

/**
 * Sends server event to Meta CAPI.
 * Uses application/x-www-form-urlencoded with `data` as JSON string.
 */
async function sendMetaCapiEvent(params: {
  event: MetaEvent;
  testEventCode?: string | null;
}): Promise<MetaCapiResponse> {
  const pixelId = env.metaCapi.pixelId;
  const accessToken = env.metaCapi.accessToken;
  const apiVersion = env.metaCapi.graphApiVersion || "v24.0";

  if (!pixelId || !accessToken) {
    return {
      events_received: 0,
      messages: ["Meta CAPI skipped: META_PIXEL_ID or META_ACCESS_TOKEN missing"],
    };
  }

  // Final safety sanitize (prevents extinfo errors for website)
  sanitizeEventForWebsite(params.event);

  const url = `https://graph.facebook.com/${apiVersion}/${pixelId}/events`;

  const body = new URLSearchParams();
  body.append("data", JSON.stringify([params.event]));
  body.append("access_token", accessToken);

  if (params.testEventCode) {
    body.append("test_event_code", params.testEventCode);
  }

  const resp = await axios.post(url, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 12000,
    validateStatus: () => true,
  });

  if (resp.status < 200 || resp.status >= 300) {
    const msg = (resp.data && JSON.stringify(resp.data)) || `HTTP_${resp.status}`;
    throw new Error(`Meta CAPI request failed: ${msg}`);
  }

  return resp.data as MetaCapiResponse;
}

export async function sendMetaPurchaseEvent(args: {
  orderID: string;
  value: number;
  /** e.g. "INR" */
  currency: string;
  contentId: string;
  deliveryCategory?: "home_delivery" | "in_store";

  actionSource?: MetaActionSource | string;
  eventSourceUrl?: string | null;

  // user match keys
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;

  // passthrough
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;

  // kept for future app use, NOT used for website
  advertiserTrackingEnabled?: 0 | 1 | boolean | string | number;
  applicationTrackingEnabled?: 0 | 1 | boolean | string | number;

  /** optional prefix for event_id deduplication (e.g. "4dham_purchase_", "bbseva_purchase_") */
  eventIdPrefix?: string;
}): Promise<MetaCapiResponse> {
  const event_time = Math.floor(Date.now() / 1000);

  // fallback is WEBSITE (the primary source is the website)
  const action_source: MetaActionSource = normalizeActionSource(args.actionSource, "website");

  const event_id = `${args.eventIdPrefix ?? "purchase_"}${String(args.orderID)}`;

  const user_data = buildUserData({
    email: args.email || null,
    phone: args.phone || null,
    externalId: args.externalId || null,
    clientIp: args.clientIp || null,
    userAgent: args.userAgent || null,
    fbp: args.fbp || null,
    fbc: args.fbc || null,
  });

  const event: MetaEvent = {
    event_name: "Purchase",
    event_time,
    event_id,
    action_source,
    user_data,
    custom_data: {
      currency: String(args.currency || "INR"),
      value: Number(args.value || 0),
      contents: [
        {
          id: String(args.contentId || "CHADHAVA"),
          quantity: 1,
          delivery_category: args.deliveryCategory,
        },
      ],
    },
  };

  // WEBSITE: event_source_url is required
  if (action_source === "website") {
    const fallbackUrl = env.metaCapi.defaultEventSourceUrl || "";
    const finalUrl = (args.eventSourceUrl || fallbackUrl || "").trim();
    if (!finalUrl) {
      throw new Error(
        "Meta CAPI: action_source=website requires event_source_url (set META_DEFAULT_EVENT_SOURCE_URL or pass eventSourceUrl)",
      );
    }
    event.event_source_url = finalUrl;

    // hard-strip any accidental app_data
    if (event.app_data) delete event.app_data;
  }

  // APP: keep correct placement in app_data
  if (action_source === "app") {
    const adv = to01(args.advertiserTrackingEnabled, 0);
    const app = to01(args.applicationTrackingEnabled, adv);

    event.app_data = {
      advertiser_tracking_enabled: adv,
      application_tracking_enabled: app,
      // DO NOT send extinfo unless it is built correctly from real device info.
    };
  }

  const testEventCode = (env.metaCapi.testEventCode || "").trim() || null;

  return sendMetaCapiEvent({ event, testEventCode });
}
