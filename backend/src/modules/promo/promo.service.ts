import Promo from "./promo.model";
import { ApiError } from "../../lib/apiError";
import { hasPriorPaidBooking } from "./firstOrder";

/** Razorpay cannot create a ₹0 order, so a discount always leaves this much. */
const MIN_PAYABLE_INR = 1;

export interface AppliedPromo {
  promoName: string;
  /** What is actually taken off — the promo's amount, capped by the order value. */
  discountAmount: number;
  /** Order value after the discount, in INR. */
  finalAmount: number;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ResolvePromoOptions {
  /**
   * The devotee's WhatsApp number, in any format. Required to use a coupon the
   * admin marked `firstOrderOnly`; ignored by every other coupon.
   */
  phone?: unknown;
}

/**
 * Validates a website promo code against an INDIA LIST order value and returns
 * the discount it grants. Throws ApiError(400) with a user-facing message when
 * the code cannot be used.
 *
 * This is the server-side counterpart of the checks the puja checkout makes in
 * the browser (active, not expired, minimum order); it additionally enforces the
 * start date, `isAppOnly` and `firstOrderOnly`, which the browser never checked
 * and — in the case of who the devotee is — could not check on its own.
 *
 * Every rule lives here rather than in the checkout, so the same answer is given
 * whether the code is being previewed for display or charged for real.
 */
export const resolvePromo = async (
  rawCode: unknown,
  orderValue: number,
  options: ResolvePromoOptions = {},
): Promise<AppliedPromo> => {
  const code = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!code) throw ApiError.badRequest("Please enter a coupon code.");
  if (!Number.isFinite(orderValue) || orderValue <= 0) throw ApiError.badRequest("Invalid order value.");

  // promoName is stored as typed in the admin; codes are matched case-insensitively.
  const promo = await Promo.findOne({ promoName: { $regex: `^${escapeRegex(code)}$`, $options: "i" } }).lean();
  const now = new Date();

  if (!promo || !promo.isActive) throw ApiError.badRequest(`Coupon "${code.toUpperCase()}" is invalid.`);
  if (promo.expiryDate && new Date(promo.expiryDate) < now) {
    throw ApiError.badRequest(`Coupon "${promo.promoName}" has expired.`);
  }
  if (promo.startDate && new Date(promo.startDate) > now) {
    throw ApiError.badRequest(`Coupon "${promo.promoName}" is not active yet.`);
  }
  if (promo.isAppOnly) {
    throw ApiError.badRequest(`Coupon "${promo.promoName}" can only be used in the Vedic Vaibhav app.`);
  }
  if (orderValue < (promo.startRange || 0)) {
    throw ApiError.badRequest(
      `Coupon "${promo.promoName}" needs a minimum order of ₹${promo.startRange}.`,
      { minOrderValue: promo.startRange },
    );
  }
  if (promo.firstOrderOnly) {
    // The number is the only identity a checkout has, so without it the rule
    // cannot be applied at all — and letting the code through unchecked would
    // hand it to everyone. Asked for rather than assumed.
    const digits = String(options.phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) {
      throw ApiError.badRequest(
        `Coupon "${promo.promoName}" is for first-time devotees — please enter your WhatsApp number first, then apply it.`,
        { needsPhone: true },
      );
    }
    if (await hasPriorPaidBooking(digits)) {
      throw ApiError.badRequest(
        `Coupon "${promo.promoName}" can only be used on your first booking, and this number has booked with us before.`,
        { firstOrderOnly: true },
      );
    }
  }

  const discountAmount = Math.max(0, Math.min(Number(promo.discountAmount) || 0, orderValue - MIN_PAYABLE_INR));
  return {
    promoName: promo.promoName,
    discountAmount,
    finalAmount: orderValue - discountAmount,
  };
};
