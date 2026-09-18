import PitruPujaBooking from "./pitruPujaBooking.model";
import PitruPuja from "./pitruPuja.model";

/** Digits only — phone numbers arrive with spaces, dashes and a leading +91. */
export const phoneDigits = (value: unknown): string => String(value ?? "").replace(/\D/g, "");

/**
 * The profile card prints this string as-is and also compares it against
 * `new Date()` rendered as `M/D/YYYY` to decide whether the puja is today, so
 * the format has to match. Pinned to IST: a puja day is a calendar day in
 * India, not in UTC.
 */
const toCardDate = (iso?: string): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata" });
};

/**
 * Pitru puja bookings live in their own collection under their own field names,
 * while the profile's puja tab renders whatever `/fetch-pooja-by-mobile`
 * returns. They are mapped onto that endpoint's shape here, so the tab keeps
 * one schema and the card does not have to learn a second one.
 *
 * Only paid bookings are returned. The row is written *before* payment so the
 * order id exists when Razorpay opens, which means an unpaid row is an
 * abandoned checkout rather than something the devotee booked.
 */
export const findPitruPujaBookingsByMobile = async (last10: string) => {
  const exact = [last10, `91${last10}`, `+91${last10}`];

  const bookings = await PitruPujaBooking.find({
    paymentStatus: true,
    // Numbers are normalised to digits on write, but rows created before that
    // kept whatever was typed — the suffix match still finds those.
    $or: [{ whatsappNumber: { $in: exact } }, { whatsappNumber: { $regex: `${last10}$` } }],
  }).lean();

  if (!bookings.length) return [];

  // The booking stores no image of its own; the card's thumbnail comes from the
  // puja it was booked against. One lookup for all of them, not one per row.
  const pujaIds = [...new Set(bookings.map((b) => b.pujaId))];
  const pujas = await PitruPuja.find({ pujaId: { $in: pujaIds } })
    .select("pujaId bannerImages")
    .lean();
  const bannerByPujaId = new Map(pujas.map((p) => [p.pujaId, p.bannerImages?.[0] ?? ""]));

  return bookings.map((booking) => ({
    _id: booking._id,
    status: "confirmed",
    /** Lets the profile tell these apart from `poojaBookings` rows if it ever needs to. */
    bookingType: "pitru-puja",
    isPending: false,
    // Pitru bookings carry no completion or video-link tracking yet, so they
    // read as "In Process" until they do. `poojaLink` must be null rather than
    // undefined: the card fills its progress bar to 100% for any non-null link.
    completed: false,
    poojaLink: null,
    poojaname: booking.poojaName,
    mandirname: booking.mandirName ?? "",
    mandirimage: bannerByPujaId.get(booking.pujaId) ?? "",
    poojadate: toCardDate(booking.poojaDate),
    /** No time slot is taken for a pitru puja — the temple performs it on the day. */
    poojatime: "",
    package: booking.packageLabel,
    totalPrice: booking.price,
    currency: booking.currency,
    chargedAmount: booking.chargedAmount,
    bhaktaNames: booking.ancestorNames ?? [],
    gotra: booking.kartaGotra ? [booking.kartaGotra] : [],
    mobile: Number(phoneDigits(booking.whatsappNumber)) || undefined,
    email: "",
    // Deliberately no address fields: there is no prasad on a pitru booking,
    // and their absence is what makes the card hide its "Track Prasad" button.
    orderId: booking.orderId,
    transactionId: booking.transactionID,
    createdAt: booking.createdAt,
  }));
};
