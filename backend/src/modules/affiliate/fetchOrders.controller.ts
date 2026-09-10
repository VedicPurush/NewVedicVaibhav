import type { Request, Response } from "express";
import PoojaBooking from "../pooja/poojaBooking.model";
import PrasadBooking from "../prasad/prasadBooking.model";
import ChadhavaBooking from "../chadhava/chadhava.model";

interface IUnifiedOrder {
  order_type: "poojaBooking" | "prasadBooking" | "chadhavaBooking" | "ecomOrder";
  product_name: string;
  orderId: string;
  totalAmount: number;
  orderDate: Date;
  userId?: string;
  referralCode?: string | null;
}

type PoojaOrderDoc = {
  poojaname?: string;
  transactionId?: string;
  totalPrice?: number;
  bookingDate?: Date;
  userID?: string;
  referralCode?: string | null;
};

type PrasadOrderDoc = {
  prasadDeliveries?: Array<{ packageName?: string; mandirName?: string }>;
  orderID?: string;
  totalPrice?: number;
  bookingDate?: Date;
  userID?: string;
  referralCode?: string | null;
};

type ChadhavaOrderDoc = {
  puja?: { title?: string };
  orderID?: string;
  totalPrice?: number;
  bookingDate?: Date;
  userID?: string;
  referralCode?: string | null;
};

/**
 * Unified order feed for the partner-affiliate dashboard.
 *
 * GET /get-allOrders-for-partnerAffiliate            → every referral order
 * GET ...?limit=50                                   → first 50 only
 * GET ...?limit=all&sort=asc                         → everything, oldest → newest
 *
 * NOTE: the legacy feed also merged e-commerce (Shiprocket) orders from the
 * Ecom database; the Ecom stack is not part of this backend, so `ecomOrders`
 * is now always empty while the response shape is preserved (see port report).
 */
export const getAllOrdersForPartnerAffiliate = async (req: Request, res: Response): Promise<void> => {
  /* ───── query params ───── */
  const rawLimit = req.query.limit as string | undefined;
  const limit =
    !rawLimit || rawLimit.toLowerCase() === "all" ? Infinity : Math.max(1, Math.min(parseInt(rawLimit), 10000));

  const sortDir = String(req.query.sort).toLowerCase() === "asc" ? 1 : -1; // 1 = asc, -1 = desc

  // Only include documents where referralCode exists
  const referralFilter = { referralCode: { $exists: true } };

  /* ───── fetch ───── */
  const [poojaDocs, prasadDocs, chadhavaDocs] = await Promise.all([
    PoojaBooking.find(referralFilter, {
      poojaname: 1,
      transactionId: 1,
      totalPrice: 1,
      bookingDate: 1,
      userID: 1,
      referralCode: 1,
    }).lean<PoojaOrderDoc[]>(),
    PrasadBooking.find(referralFilter, {
      prasadDeliveries: 1,
      orderID: 1,
      totalPrice: 1,
      bookingDate: 1,
      userID: 1,
      referralCode: 1,
    }).lean<PrasadOrderDoc[]>(),
    ChadhavaBooking.find(referralFilter, {
      puja: 1,
      orderID: 1,
      totalPrice: 1,
      bookingDate: 1,
      userID: 1,
      referralCode: 1,
    }).lean<ChadhavaOrderDoc[]>(),
  ]);

  /* ───── map ───── */
  const poojaOrders: IUnifiedOrder[] = poojaDocs.map((d) => ({
    order_type: "poojaBooking",
    product_name: d.poojaname ?? "Pooja",
    orderId: d.transactionId as string,
    totalAmount: d.totalPrice as number,
    orderDate: d.bookingDate as Date,
    userId: d.userID,
    referralCode: d.referralCode,
  }));

  const prasadOrders: IUnifiedOrder[] = prasadDocs.map((d) => {
    const first = d.prasadDeliveries?.[0];
    return {
      order_type: "prasadBooking",
      product_name: first?.packageName || first?.mandirName || "Prasad",
      orderId: d.orderID as string,
      totalAmount: d.totalPrice as number,
      orderDate: d.bookingDate as Date,
      userId: d.userID,
      referralCode: d.referralCode,
    };
  });

  const chadhavaOrders: IUnifiedOrder[] = chadhavaDocs.map((d) => ({
    order_type: "chadhavaBooking",
    product_name: d.puja?.title || "Chadhava",
    orderId: d.orderID as string,
    totalAmount: d.totalPrice as number,
    orderDate: d.bookingDate as Date,
    userId: d.userID,
    referralCode: d.referralCode,
  }));

  // Ecom (Shiprocket) orders are no longer served by this backend.
  const ecomOrders: IUnifiedOrder[] = [];

  /* ───── merge, sort, and limit for overall data consistency ───── */
  let all = [...poojaOrders, ...prasadOrders, ...chadhavaOrders, ...ecomOrders].sort((a, b) =>
    sortDir === 1 ? a.orderDate.getTime() - b.orderDate.getTime() : b.orderDate.getTime() - a.orderDate.getTime(),
  );

  if (limit !== Infinity) {
    all = all.slice(0, limit); // Trim the combined array if a limit is supplied
  }

  // Re-segment the sorted and limited data
  const finalPoojaBookings = all.filter((o) => o.order_type === "poojaBooking");
  const finalPrasadBookings = all.filter((o) => o.order_type === "prasadBooking");
  const finalChadhavaBookings = all.filter((o) => o.order_type === "chadhavaBooking");
  const finalEcomOrders = all.filter((o) => o.order_type === "ecomOrder");

  res.json({
    counts: {
      overallCount: all.length,
      poojaBookingCount: finalPoojaBookings.length,
      prasadBookingCount: finalPrasadBookings.length,
      chadhavaBookingCount: finalChadhavaBookings.length,
      ecomOrderCount: finalEcomOrders.length,
    },
    data: {
      poojaBookings: finalPoojaBookings,
      prasadBookings: finalPrasadBookings,
      chadhavaBookings: finalChadhavaBookings,
      ecomOrders: finalEcomOrders,
    },
  });
};
