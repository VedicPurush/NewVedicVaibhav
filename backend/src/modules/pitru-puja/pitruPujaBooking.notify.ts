import type { IPitruPujaBooking } from "./pitruPujaBooking.model";
import { sendWhatsappTemplateMessage } from "../../utils/whatsapp";
import { sendFast2SmsDlt } from "../../utils/sms";
import { pitruPujaBookingToAdmin } from "../../utils/mail/smtpUs";
import { sendMetaPurchaseEvent } from "../../utils/metaCapi";
import { logger } from "../../lib/logger";

/**
 * Everything that happens once a pitru puja booking is paid for.
 *
 * Call this EXACTLY ONCE per booking. Both callers — the browser's verify call
 * and the Razorpay webhook — guard it behind the same atomic `paymentStatus`
 * flip, so whichever of the two confirms the booking is the one that notifies,
 * and a devotee never gets two confirmations for one puja.
 *
 * Every step is best-effort and swallows its own failure: a devotee who has
 * paid must never see an error because a message did not go out, and one
 * failing channel must not stop the others.
 */

/** Prefix for the Meta purchase `event_id` — see the controller for the pairing. */
const PURCHASE_EVENT_ID_PREFIX = "pitru_purchase_";

/**
 * Shared with the ordinary puja flow, which registered them.
 *
 * `pujabooking_with_applink` takes puja | mandir | date | transaction, and DLT
 * template 195395 takes devotee | puja | date — a pitru booking has all of
 * those, so it borrows both rather than waiting on new registrations. The
 * wording is therefore the generic puja confirmation, not pitru-specific.
 */
const WHATSAPP_TEMPLATE_NAME = "pujabooking_with_applink";
const WHATSAPP_TEMPLATE_ID = "2933431";
const WHATSAPP_HEADER_IMAGE =
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/chadhavathankyou.png";
const SMS_DLT_TEMPLATE_ID = "195395";

/** IST, because a puja day is a calendar day in India. */
const displayDate = (iso?: string): string => {
  if (!iso) return "the scheduled date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "the scheduled date";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const errPayload = (err: unknown) =>
  (err as { response?: { data?: unknown }; message?: string })?.response?.data ??
  (err as { message?: string })?.message ??
  err;

export const sendPitruPujaConfirmations = async (booking: IPitruPujaBooking): Promise<void> => {
  const last10 = String(booking.whatsappNumber || "")
    .replace(/\D/g, "")
    .slice(-10);
  const pujaName = booking.poojaName || "Pitru Puja";
  const pujaDate = displayDate(booking.poojaDate);

  // WhatsApp — the channel the checkout promised updates on.
  if (last10.length === 10) {
    try {
      await sendWhatsappTemplateMessage({
        to: `91${last10}`,
        templateName: WHATSAPP_TEMPLATE_NAME,
        templateId: WHATSAPP_TEMPLATE_ID,
        headerImageUrl: WHATSAPP_HEADER_IMAGE,
        parameters: [pujaName, booking.mandirName || "the temple", pujaDate, booking.orderId],
      });
    } catch (err) {
      logger.error({ err: errPayload(err), orderId: booking.orderId }, "[PitruPuja] WhatsApp failed");
    }

    try {
      await sendFast2SmsDlt({
        to: last10,
        dltTemplateId: SMS_DLT_TEMPLATE_ID,
        variables: [booking.kartaName || "Devotee", pujaName, pujaDate],
      });
    } catch (err) {
      logger.error({ err: errPayload(err), orderId: booking.orderId }, "[PitruPuja] Fast2SMS failed");
    }
  }

  // Admin — nobody on the temple side learns of a booking otherwise.
  try {
    await pitruPujaBookingToAdmin({
      orderId: booking.orderId,
      poojaName: pujaName,
      packageLabel: booking.packageLabel,
      personCount: booking.personCount,
      ancestorNames: booking.ancestorNames ?? [],
      kartaName: booking.kartaName,
      kartaGotra: booking.kartaGotra,
      whatsappNumber: booking.whatsappNumber,
      callingNumber: booking.callingNumber,
      mandirName: booking.mandirName,
      mandirPlace: booking.mandirPlace,
      poojaDate: booking.poojaDate,
      price: Number(booking.price || 0),
      originalAmount: booking.originalAmount,
      promoCode: booking.promoCode,
      discountAmount: booking.discountAmount,
      transactionId: booking.transactionID,
      currency: booking.currency,
      chargedAmount: booking.chargedAmount,
      fxRate: booking.fxRate,
      priceMultiplier: booking.priceMultiplier,
    });
  } catch (err) {
    logger.error({ err: errPayload(err), orderId: booking.orderId }, "[PitruPuja] Admin mail failed");
  }

  // Meta CAPI. Attribution comes off the booking, not off the confirming
  // request — the webhook is a server-to-server call and carries none of the
  // devotee's headers.
  try {
    await sendMetaPurchaseEvent({
      // The booking's own orderId (VVPP…), which is also what the browser puts
      // in its event id — not the Razorpay order id.
      orderID: booking.orderId,
      // `price` is the amount actually charged: markUpInr() has already been
      // applied for international cards, and it is in INR either way.
      value: Number(booking.price || 0),
      currency: "INR",
      contentId: booking.pujaId || "PITRU_PUJA",
      deliveryCategory: "home_delivery",
      actionSource: "website",
      phone: booking.whatsappNumber || null,
      clientIp: booking.clientIp ?? null,
      userAgent: booking.userAgent ?? null,
      fbp: booking.fbp ?? null,
      fbc: booking.fbc ?? null,
      eventSourceUrl: booking.eventSourceUrl ?? null,
      eventIdPrefix: PURCHASE_EVENT_ID_PREFIX,
    });
  } catch (err) {
    logger.error({ err: errPayload(err), orderId: booking.orderId }, "[MetaCAPI][PitruPuja] Purchase failed");
  }
};
