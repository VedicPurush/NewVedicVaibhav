import PoojaBooking from "../pooja/poojaBooking.model";
import NewChadhavaBooking from "../chadhava/newChadhavaBooking.model";
import PitruPujaBooking from "../pitru-puja/pitruPujaBooking.model";

/**
 * Is this the devotee's first booking?
 * -----------------------------------
 * Answers the one question a `firstOrderOnly` coupon needs: has this phone
 * number ever paid for something on the website before?
 *
 * The number is the only identity a website checkout has — there is no login at
 * the payment step — so it is what the booking collections are searched by. Each
 * of them stores it under its own name and, in poojaBookings, sometimes as a
 * Number rather than a String, so the variants below are built once and reused.
 *
 * Scope is deliberately the three collections that hold the website's own paid
 * bookings: pujas, chadhavas and pitru pujas. Subscriptions, yatra sevas and
 * prasad orders are not counted — they are low volume next to these, and a
 * coupon wrongly *allowed* is a far smaller harm than a returning devotee's
 * genuine first puja being refused because an unrelated collection matched.
 */

/** Digits only — numbers arrive with spaces, dashes and a leading +91. */
const phoneDigits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

export const hasPriorPaidBooking = async (rawPhone: unknown): Promise<boolean> => {
  const digits = phoneDigits(rawPhone);
  if (digits.length < 10) return false;

  const last10 = digits.slice(-10);
  const stringVariants = [last10, `91${last10}`, `+91${last10}`];
  const numberVariants = [Number(last10), Number(`91${last10}`)].filter((n) => Number.isFinite(n));
  // Rows written before numbers were normalised kept whatever was typed
  // ("98765 43210", "+91-98765-43210"), so a suffix match backs up the exact
  // list — but only on the collections that store the number as a String.
  // Mongoose casts a query against its schema path, and a $regex aimed at a
  // Number path throws a CastError rather than simply not matching.
  const suffix = { $regex: `${last10}$` };

  const [pooja, chadhava, pitru] = await Promise.all([
    // poojaBookings rows are only written once payment has gone through —
    // an unpaid attempt lives in pendingBookings instead. `mobile` is a Number
    // there, so the string variants below are cast to numbers on the way in and
    // no suffix match is possible (or needed).
    PoojaBooking.exists({
      $or: [{ mobile: { $in: stringVariants } }, { mobile: { $in: numberVariants } }],
    }),
    NewChadhavaBooking.exists({
      status: "confirmed",
      $or: [{ whatsapp: { $in: stringVariants } }, { whatsapp: suffix }],
    }),
    PitruPujaBooking.exists({
      paymentStatus: true,
      $or: [{ whatsappNumber: { $in: stringVariants } }, { whatsappNumber: suffix }],
    }),
  ]);

  return Boolean(pooja || chadhava || pitru);
};
