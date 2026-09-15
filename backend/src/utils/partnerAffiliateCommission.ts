import axios from "axios";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import {
  externalApiHeaders,
  recordAppReferralReward,
  resolveAppReferralRoute,
  tryConsumeAppReferralOrder,
} from "./partnerAffiliateReferralCap";

/**
 * Generic partner-affiliate commission push for ALL Vedic Vaibhav booking modules.
 *
 * Every VV module (pooja, chadhava, prasad, jyotirlinga, banke bihari, gau seva, dham yatra,
 * personalized pooja …) uses the SAME two-stage release%+role-split engine on the partner-affiliate
 * side — the `department` only categorizes the order for reporting. So this one helper serves every
 * module: pass the booking's referral code, order id, amount, phone and a department string.
 *
 * - No-op (silent) when there's no referral code — nobody earns, order still completes.
 * - APP orders go through the same rules as pooja/prasad/chadhava: the referred customer's
 *   first-N-orders cap, then partner code -> commission push, plain customer code -> store credit.
 * - Reads the endpoint from env.partnerAffiliate.orderApi (normalized per-environment by
 *   config/env.ts, so it hits localhost:9001 locally / the live host in production).
 * - NEVER throws — a booking must succeed even if this background push fails.
 */
/** Checkout-supplied order source -> 'APP' | 'WEBSITE'. Anything not explicitly 'APP' is a website order. */
export const normalizeOrderSource = (value: unknown): "APP" | "WEBSITE" =>
  String(value ?? "").trim().toUpperCase() === "APP" ? "APP" : "WEBSITE";

export async function pushVedicVaibhavOrderCommission(params: {
  referralCode?: string | null;
  /** the customer's user id (audit only) */
  refferalUserId?: string | null;
  orderId: string | number | null | undefined;
  orderPrice: number;
  /** e.g. 'BANKE_BIHARI_SEVA' */
  department: string;
  /** e.g. 'BANKE_BIHARI_SEVA' */
  productName: string;
  phone?: string | null;
  /** 'WEBSITE' | 'APP' */
  orderSource?: string;
}): Promise<void> {
  try {
    const referralCode = String(params.referralCode || "").trim();
    if (!referralCode || referralCode.toLowerCase() === "organic") return; // no referrer -> skip

    const orderId = String(params.orderId || "").trim();
    if (!orderId) return;

    const orderPrice = Number(params.orderPrice) || 0;
    if (!(orderPrice > 0)) return;

    const orderSource = params.orderSource === "APP" ? "APP" : "WEBSITE";
    if (orderSource === "APP") {
      const withinCap = await tryConsumeAppReferralOrder(params.phone);
      if (!withinCap) {
        logger.info(
          `[PartnerAffiliate][${params.department}] Skipping commission for order ${orderId}: app referral order cap reached for this customer.`,
        );
        return;
      }
      // Exactly one path per order: plain-customer code -> store credit, partner code -> push below.
      if ((await resolveAppReferralRoute(referralCode)) === "PEER") {
        await recordAppReferralReward({
          referrerCode: referralCode,
          orderId,
          orderAmount: orderPrice,
          department: params.department,
          referredPhone: params.phone ?? null,
        });
        return;
      }
    }

    const apiUrl = env.partnerAffiliate.orderApi;
    if (!apiUrl) {
      logger.warn(`[PartnerAffiliate][${params.department}] partner-affiliate order API not set. Skipping.`);
      return;
    }

    const payload = {
      userId: referralCode, // the referrer (partner/affiliate) code
      refferal_user_id: params.refferalUserId || referralCode, // the customer
      orderId,
      orderPrice,
      time: new Date().toISOString(),
      department: params.department,
      products: [
        {
          productName: params.productName,
          productPrice: orderPrice,
          commissionPercent: [0, 0, 0], // Vedic Vaibhav engine computes the split; per-product % unused
        },
      ],
      orderSource,
      customerId: params.phone || undefined, // used by the website "first order only" cap
    };

    const resp = await axios.post(apiUrl, payload, {
      headers: { "Content-Type": "application/json", ...externalApiHeaders() },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (resp.status < 200 || resp.status >= 300) {
      logger.warn(
        { status: resp.status, data: resp.data },
        `[PartnerAffiliate][${params.department}] Non-2xx for order ${orderId}`,
      );
    } else {
      logger.info(`[PartnerAffiliate][${params.department}] Order ${orderId} sent successfully.`);
    }
  } catch (err: any) {
    logger.error(
      { err: err?.response?.data || err?.message || err },
      `[PartnerAffiliate][${params.department}] Failed for order ${params.orderId}`,
    );
  }
}
