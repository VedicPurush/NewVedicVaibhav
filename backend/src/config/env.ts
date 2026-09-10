import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Layered environment loading. Precedence (first hit wins, dotenv never
 * overwrites an existing variable):
 *   1. real process env (e.g. `NODE_ENV=production pnpm start`, or the host's
 *      environment settings on the deployment platform)
 *   2. .env             — the mode switch (NODE_ENV) and nothing else
 *   3. .env.<mode>      — every credential and setting for that mode
 *
 * `.env.development` points at the testing cluster and test payment keys;
 * `.env.production` points at the live ones. Both use the *same key names*, so
 * there is no live-vs-testing switch anywhere in the code — the file that gets
 * loaded is the answer. Neither is committed; see the .example templates.
 */
const root = path.resolve(__dirname, "..", "..");
const explicitNodeEnv = process.env.NODE_ENV;
loadDotenv({ path: path.join(root, ".env"), quiet: true });
const NODE_ENV =
  (explicitNodeEnv ?? process.env.NODE_ENV) === "production" ? "production" : "development";
// Normalize for every later reader (logger, third-party libs).
process.env.NODE_ENV = NODE_ENV;
loadDotenv({ path: path.join(root, `.env.${NODE_ENV}`), quiet: true });

/** A Mongo URI that must be present — missing one is reported at boot by name. */
const mongoUri = (key: string) =>
  z
    .string()
    .trim()
    .min(1, `${key} is required — check backend/.env.${NODE_ENV}`);

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5009),

  // MongoDB — whichever cluster the loaded .env.<mode> file points at.
  MONGO_URI_VEDIC_VAIBHAV_MAIN: mongoUri("MONGO_URI_VEDIC_VAIBHAV_MAIN"),
  MONGO_URI_JYOTIRLING: mongoUri("MONGO_URI_JYOTIRLING"),
  MONGO_URI_PARTNER_AFFILIATE: mongoUri("MONGO_URI_PARTNER_AFFILIATE"),

  /**
   * The every-10-minutes pending-booking sweep reconciles unpaid bookings
   * against Razorpay and deletes/finalizes them. Harmless when dev points at a
   * testing cluster; not harmless when it points at the live one, where a
   * developer machine would be mutating real bookings on a timer.
   *
   * Defaults to on in production, off everywhere else. Set explicitly to
   * override (e.g. ENABLE_BOOKING_SWEEPS=true to test the job locally).
   */
  ENABLE_BOOKING_SWEEPS: z.enum(["true", "false"]).optional(),

  // Auth
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Razorpay — one key pair per mode file. PAYMENT_MODE only labels which set
  // is loaded (logs, warnings); "production" is the legacy alias for "live".
  PAYMENT_MODE: z.enum(["live", "test", "production"]).default(NODE_ENV === "production" ? "live" : "test"),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  RAZORPAY_4DHAM_WEBHOOK_SECRET: z.string().default(""),
  RAZORPAY_BB_WEBHOOK_SECRET: z.string().default(""),
  RAZORPAY_GAUSEVA_WEBHOOK_SECRET: z.string().default(""),

  // Email
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_EMAIL: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_FROM_EMAIL: z.string().default(""),
  SMTP_ADMIN_MAIL: z.string().default(""),

  // SMS / OTP
  FAST2SMS_API_KEY: z.string().default(""),
  FAST2SMS_SENDER_ID: z.string().default(""),
  FAST2SMS_TEMPLATE_ID: z.string().default(""),

  // WhatsApp
  PINBOT_API_KEY: z.string().default(""),
  PINBOT_PHONE_NUMBER_ID: z.string().default(""),

  // Twilio (SMS OTP)
  TWILIO_ACCOUNT_SID: z.string().default(""),
  TWILIO_AUTH_TOKEN: z.string().default(""),

  // Meta Conversions API
  META_PIXEL_ID: z.string().default(""),
  META_ACCESS_TOKEN: z.string().default(""),
  META_GRAPH_API_VERSION: z.string().default("v24.0"),
  META_DEFAULT_EVENT_SOURCE_URL: z.string().default("https://vedicvaibhav.com"),
  META_TEST_EVENT_CODE: z.string().default(""),

  // Shiprocket
  SHIPROCKET_API_BASE_URL: z.string().default("https://apiv2.shiprocket.in"),
  SHIPROCKET_EMAIL: z.string().default(""),
  SHIPROCKET_PASSWORD: z.string().default(""),
  SHIPROCKET_DEFAULT_PICKUP_POSTCODE: z.string().default(""),

  // Partner affiliate
  PARTNER_AFFILIATE_BASE_URL: z.string().default(""),
  PARTNER_AFFILIATE_ORDER_API: z.string().default(""),
  EXTERNAL_API_KEY: z.string().default(""),

  /**
   * International pricing / FX overrides. Every one is OPTIONAL and every one has
   * a committed default in config/pricing.ts — they exist so a rate or a price can
   * be hotfixed without a deploy.
   *
   * Kept as raw strings here on purpose: config/currency.ts parses them
   * defensively, warns on anything malformed and keeps the default. A typo in an
   * env var must never be the reason the site cannot take payments, so these must
   * not be able to fail the boot-time schema.
   */
  FX_RATES: z.string().default(""), // "USD:90,GBP:118" — INR per unit
  FX_BUFFER: z.string().default(""), // "1.04" — margin over the raw rate (1.00–1.25)
  FX_MULTIPLIER: z.string().default(""), // "2" — one flat foreign markup, turns the ladder off
  FX_MULTIPLIERS: z.string().default(""), // "USD:2.5,NPR:1" — per-currency, beats both
  FX_TIERS: z.string().default(""), // "100:4,150:3,*:2" — replace the whole ladder

  // Geo-IP — resolves the caller's country so the browser's timezone guess can be
  // corrected by their actual connection. Both optional; see utils/geoip.ts.
  GEOIP_URL: z.string().default(""), // "https://ipinfo.io/{ip}/json?token=…"
  GEOIP_DEV_COUNTRY: z.string().default(""), // "DE", or "auto" — private client IPs only

  // Misc
  ENCRYPTION_KEY: z.string().default(""),
  ONESIGNAL_APP_ID: z.string().default(""),
  ONESIGNAL_API_KEY: z.string().default(""),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with a readable list of what is missing/invalid.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(
    `Invalid environment configuration (NODE_ENV=${NODE_ENV} → backend/.env.${NODE_ENV}):\n${issues}`,
  );
}
const raw = parsed.data;

export const isProduction = NODE_ENV === "production";
/** Dev talks to a locally-run partner dashboard; production talks to the live one.
 *  Previously a separate APP_ENV switch — redundant now that .env.<mode> decides. */
export const isLocal = !isProduction;

const isLoopback = (u: string): boolean => /localhost|127\.0\.0\.1|\[::1\]/i.test(u);

/** Partner-affiliate endpoints — dev talks to a local dashboard; production
 *  refuses loopback values left behind in the env file. */
const PARTNER_AFFILIATE_LOCAL = "http://localhost:9001";
const PARTNER_AFFILIATE_PROD = "https://partner.vedicvaibhav.in";
const partnerAffiliateBaseUrl = isLocal
  ? PARTNER_AFFILIATE_LOCAL
  : raw.PARTNER_AFFILIATE_BASE_URL && !isLoopback(raw.PARTNER_AFFILIATE_BASE_URL)
    ? raw.PARTNER_AFFILIATE_BASE_URL.replace(/\/+$/, "")
    : PARTNER_AFFILIATE_PROD;
const partnerAffiliateOrderApi = isLocal
  ? `${PARTNER_AFFILIATE_LOCAL}/api/external/orders`
  : raw.PARTNER_AFFILIATE_ORDER_API && !isLoopback(raw.PARTNER_AFFILIATE_ORDER_API)
    ? raw.PARTNER_AFFILIATE_ORDER_API
    : `${PARTNER_AFFILIATE_PROD}/api/external/orders`;

const enableBookingSweeps =
  raw.ENABLE_BOOKING_SWEEPS === undefined
    ? isProduction
    : raw.ENABLE_BOOKING_SWEEPS === "true";

export const env = {
  nodeEnv: NODE_ENV,
  isProduction,
  isLocal,
  port: raw.PORT,
  enableBookingSweeps,

  db: {
    main: raw.MONGO_URI_VEDIC_VAIBHAV_MAIN,
    jyotirling: raw.MONGO_URI_JYOTIRLING,
    partnerAffiliate: raw.MONGO_URI_PARTNER_AFFILIATE,
  },

  jwt: {
    secret: raw.JWT_SECRET,
    expiresIn: raw.JWT_EXPIRES_IN,
  },
  razorpay: {
    mode: (raw.PAYMENT_MODE === "test" ? "test" : "live") as "live" | "test",
    keyId: raw.RAZORPAY_KEY_ID,
    keySecret: raw.RAZORPAY_KEY_SECRET,
    webhookSecret: raw.RAZORPAY_WEBHOOK_SECRET,
    fourDhamWebhookSecret: raw.RAZORPAY_4DHAM_WEBHOOK_SECRET,
    bbWebhookSecret: raw.RAZORPAY_BB_WEBHOOK_SECRET || raw.RAZORPAY_WEBHOOK_SECRET,
    gauSevaWebhookSecret: raw.RAZORPAY_GAUSEVA_WEBHOOK_SECRET || raw.RAZORPAY_WEBHOOK_SECRET,
  },

  smtp: {
    host: raw.SMTP_HOST,
    port: raw.SMTP_PORT,
    email: raw.SMTP_EMAIL,
    password: raw.SMTP_PASSWORD,
    fromEmail: raw.SMTP_FROM_EMAIL || raw.SMTP_EMAIL,
    adminEmail: raw.SMTP_ADMIN_MAIL,
  },

  fast2sms: {
    apiKey: raw.FAST2SMS_API_KEY,
    senderId: raw.FAST2SMS_SENDER_ID,
    templateId: raw.FAST2SMS_TEMPLATE_ID,
  },

  whatsapp: {
    pinbotApiKey: raw.PINBOT_API_KEY,
    pinbotPhoneNumberId: raw.PINBOT_PHONE_NUMBER_ID,
  },

  twilio: {
    accountSid: raw.TWILIO_ACCOUNT_SID,
    authToken: raw.TWILIO_AUTH_TOKEN,
  },

  metaCapi: {
    pixelId: raw.META_PIXEL_ID,
    accessToken: raw.META_ACCESS_TOKEN,
    graphApiVersion: raw.META_GRAPH_API_VERSION,
    defaultEventSourceUrl: raw.META_DEFAULT_EVENT_SOURCE_URL,
    testEventCode: raw.META_TEST_EVENT_CODE,
  },

  shiprocket: {
    baseUrl: raw.SHIPROCKET_API_BASE_URL.replace(/\/+$/, ""),
    email: raw.SHIPROCKET_EMAIL,
    password: raw.SHIPROCKET_PASSWORD,
    defaultPickupPostcode: raw.SHIPROCKET_DEFAULT_PICKUP_POSTCODE,
  },

  partnerAffiliate: {
    baseUrl: partnerAffiliateBaseUrl,
    orderApi: partnerAffiliateOrderApi,
    externalApiKey: raw.EXTERNAL_API_KEY,
  },

  /** Raw FX override strings — parsed (and validated) by config/currency.ts. */
  fx: {
    rates: raw.FX_RATES,
    buffer: raw.FX_BUFFER,
    multiplier: raw.FX_MULTIPLIER,
    multipliers: raw.FX_MULTIPLIERS,
    tiers: raw.FX_TIERS,
  },

  geoip: {
    url: raw.GEOIP_URL.trim(),
    devCountry: raw.GEOIP_DEV_COUNTRY.trim(),
  },

  encryptionKey: raw.ENCRYPTION_KEY,
  oneSignal: {
    appId: raw.ONESIGNAL_APP_ID,
    apiKey: raw.ONESIGNAL_API_KEY,
  },
} as const;

export type Env = typeof env;
