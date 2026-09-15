// Shared helper for the Vedic Vaibhav <-> Partner Affiliate commission integration.
//
// The "first N app orders only" rule (admin-editable, default 15) is enforced HERE, on Vedic
// Vaibhav's own server, against Vedic Vaibhav's own User record — NOT on the partner-affiliate
// side. This is deliberate: the partner-affiliate backend doesn't own "how many orders has
// this customer placed", and enforcing the cap here means it's a single atomic DB operation
// (no cross-service round trip, no race condition between two near-simultaneous orders from
// the same customer). Website link-based referrals have NO cap — this only ever applies to
// orderSource === 'APP'.
import axios from "axios";
import { User } from "../modules/users/user.model";
import AppReferralReward from "../modules/affiliate/appReferralReward.model";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const DEFAULT_APP_REFERRAL_ORDER_CAP = 15;
const CAP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — the cap rarely changes; short staleness is fine

let cachedCap: number | null = null;
let cachedAt = 0;

/** Base of the partner-affiliate external API (…/api/external), derived from the orders URL. */
const partnerAffiliateApiBase = (): string | null => {
  const ordersApiUrl = env.partnerAffiliate.orderApi;
  if (!ordersApiUrl) return null;
  return ordersApiUrl.replace(/\/orders\/?$/, "");
};

/** X-API-KEY header for every partner-affiliate external API call (empty when no key is configured). */
export const externalApiHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (env.partnerAffiliate.externalApiKey) {
    headers["X-API-KEY"] = env.partnerAffiliate.externalApiKey;
  }
  return headers;
};

/**
 * Reads the admin-configured appReferralOrderCap from the partner-affiliate platform's public
 * commission-config endpoint (see apps/api routes/externalApi.ts GET /commission-config/:platform).
 * Derived from env.partnerAffiliate.orderApi (…/api/external/orders -> …/api/external), so no new
 * env var is required. Falls back to the default cap on any failure — this must never block a
 * booking from completing.
 */
async function getAppReferralOrderCap(): Promise<number> {
  const now = Date.now();
  if (cachedCap != null && now - cachedAt < CAP_CACHE_TTL_MS) {
    return cachedCap;
  }

  try {
    const base = partnerAffiliateApiBase();
    if (!base) return DEFAULT_APP_REFERRAL_ORDER_CAP;
    const configUrl = `${base}/commission-config/VEDIC_VAIBHAV`;

    const res = await axios.get(configUrl, { headers: externalApiHeaders(), timeout: 5000 });
    const cap = res.data?.data?.appReferralOrderCap;
    if (typeof cap === "number" && cap >= 0) {
      cachedCap = cap;
      cachedAt = now;
      return cap;
    }
    return DEFAULT_APP_REFERRAL_ORDER_CAP;
  } catch (error: any) {
    logger.warn(
      { err: error?.message || error },
      "[partnerAffiliateReferralCap] Failed to fetch appReferralOrderCap, using default",
    );
    return DEFAULT_APP_REFERRAL_ORDER_CAP;
  }
}

/**
 * Normalizes an Indian mobile number the same way the rest of this codebase already does
 * (see poojaBooking.controller.ts's address-update block) so the User lookup matches reliably
 * regardless of how the digits were formatted at checkout.
 */
function normalizeIndianPhone(mobile: string | undefined | null): string | null {
  if (!mobile) return null;
  const digits = String(mobile).replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `+91 ${digits.slice(-10)}`;
}

/**
 * Atomically checks-and-increments the referred customer's app-order counter. Returns true iff
 * this order is within their first-N-orders window (and should therefore be pushed to the
 * partner-affiliate commission API); false if the cap has already been reached (order still
 * completes normally — it just doesn't earn anyone a commission).
 *
 * Uses a single findOneAndUpdate with a $expr cap condition so two near-simultaneous orders
 * from the same customer can never both slip in under the cap.
 */
export async function tryConsumeAppReferralOrder(mobile: string | undefined | null): Promise<boolean> {
  const phone = normalizeIndianPhone(mobile);
  if (!phone) {
    // Can't identify the customer reliably — err on the side of NOT counting/crediting rather
    // than risking an uncapped/unbounded commission stream.
    return false;
  }

  const cap = await getAppReferralOrderCap();
  if (cap <= 0) return false;

  try {
    const updated = await User.findOneAndUpdate(
      {
        phone,
        $expr: { $lt: [{ $ifNull: ["$referralOrdersCounted", 0] }, cap] },
      },
      { $inc: { referralOrdersCounted: 1 } },
      { new: true },
    );
    return !!updated;
  } catch (error) {
    logger.error({ err: error }, "[partnerAffiliateReferralCap] tryConsumeAppReferralOrder failed");
    return false;
  }
}

// ---------------------------------------------------------------------------
// APP PEER-referral store-credit rewards (see modules/affiliate/appReferralReward.model.ts).
// A plain app customer referring the app to a friend earns a % of the friend's app orders as
// store credit. This is separate from partner-affiliate wallet commission — the two are mutually
// exclusive per order, decided by resolveAppReferralRoute() below.
// ---------------------------------------------------------------------------

const DEFAULT_APP_REFERRAL_REWARD_PERCENT = 5;
let cachedRewardPercent: number | null = null;
let cachedRewardAt = 0;

/**
 * Admin-configured store-credit reward % for APP peer referrals (PlatformCommissionConfig on the
 * partner-affiliate side). Cached like the order cap; falls back to the default on any failure so
 * reward math never blocks a booking.
 */
async function getAppReferralRewardPercent(): Promise<number> {
  const now = Date.now();
  if (cachedRewardPercent != null && now - cachedRewardAt < CAP_CACHE_TTL_MS) {
    return cachedRewardPercent;
  }
  try {
    const base = partnerAffiliateApiBase();
    if (!base) return DEFAULT_APP_REFERRAL_REWARD_PERCENT;
    const res = await axios.get(`${base}/commission-config/VEDIC_VAIBHAV`, {
      headers: externalApiHeaders(),
      timeout: 5000,
    });
    const pct = res.data?.data?.appReferralRewardPercent;
    if (typeof pct === "number" && pct >= 0) {
      cachedRewardPercent = pct;
      cachedRewardAt = now;
      return pct;
    }
    return DEFAULT_APP_REFERRAL_REWARD_PERCENT;
  } catch (error: any) {
    logger.warn(
      { err: error?.message || error },
      "[partnerAffiliateReferralCap] Failed to fetch appReferralRewardPercent, using default",
    );
    return DEFAULT_APP_REFERRAL_REWARD_PERCENT;
  }
}

export type AppReferralRoute = "PARTNER" | "PEER";

/**
 * Decides where an APP referral order is paid: partner-affiliate WALLET COMMISSION (the code
 * belongs to a partner/affiliate/promoter) or this app's own PEER store-credit ledger (a plain
 * customer's code). Looks the code up on the partner-affiliate side (GET /referral-code-type).
 *
 * Fail-open to 'PARTNER' on any failure: that preserves the pre-existing behavior (push to
 * /orders) and — because the partner-affiliate side records no commission when the code isn't a
 * real partner — a mis-routed peer at worst earns nothing that order. It can never double-pay,
 * which is the outcome we most need to avoid.
 */
export async function resolveAppReferralRoute(
  referrerCode: string | undefined | null,
): Promise<AppReferralRoute> {
  const code = (referrerCode ?? "").toString().trim();
  // 'organic' is the sentinel for "no referrer" (referralSourcePuja's default) — never a real code.
  if (!code || code.toLowerCase() === "organic") return "PARTNER";
  try {
    const base = partnerAffiliateApiBase();
    if (!base) return "PARTNER";
    const res = await axios.get(`${base}/referral-code-type/${encodeURIComponent(code)}`, {
      headers: externalApiHeaders(),
      timeout: 5000,
    });
    const isPartner = res.data?.data?.isPartnerAffiliateUser === true;
    return isPartner ? "PARTNER" : "PEER";
  } catch (error: any) {
    logger.warn(
      { err: error?.message || error },
      "[partnerAffiliateReferralCap] resolveAppReferralRoute failed, defaulting to PARTNER",
    );
    return "PARTNER";
  }
}

/**
 * Records a PEER store-credit reward for one APP order, idempotent on orderId (unique index +
 * $setOnInsert => a duplicate/retried push can't double-credit). Reward = orderAmount *
 * rewardPercent / 100, credited to the referring customer's code. Never throws — a booking must
 * still complete even if reward bookkeeping fails.
 */
export async function recordAppReferralReward(params: {
  referrerCode: string;
  orderId: string;
  orderAmount: number;
  department?: string;
  referredPhone?: string | null;
  referredUserId?: unknown;
  rewardPercent?: number;
}): Promise<void> {
  try {
    const code = (params.referrerCode ?? "").toString().trim();
    if (!code || code.toLowerCase() === "organic" || !params.orderId || !(params.orderAmount > 0)) return;
    const pct = params.rewardPercent != null ? params.rewardPercent : await getAppReferralRewardPercent();
    if (!(pct > 0)) return;
    const rewardAmount = Math.round(((params.orderAmount * pct) / 100) * 100) / 100;
    if (!(rewardAmount > 0)) return;

    await AppReferralReward.updateOne(
      { orderId: String(params.orderId) },
      {
        $setOnInsert: {
          platform: "VEDIC_VAIBHAV",
          referrerCode: code,
          referredUserId: params.referredUserId ?? null,
          referredPhone: params.referredPhone ?? null,
          orderId: String(params.orderId),
          department: params.department ?? null,
          orderAmount: params.orderAmount,
          rewardPercent: pct,
          rewardAmount,
          redeemedAmount: 0,
          status: "PENDING",
          redemptionOrderIds: [],
        },
      },
      { upsert: true },
    );
  } catch (error: any) {
    logger.error(
      { err: error?.message || error },
      "[partnerAffiliateReferralCap] recordAppReferralReward failed",
    );
  }
}
