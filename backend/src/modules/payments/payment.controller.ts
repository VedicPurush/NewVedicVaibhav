import type { Request, Response } from "express";
import { razorpay } from "../../lib/razorpay";
import { logger } from "../../lib/logger";

/**
 * Creates a bare Razorpay order for the legacy pooja checkout.
 * NOTE: the legacy controller instantiated its own Razorpay client with
 * hard-coded TEST credentials; this port uses the central client from
 * lib/razorpay (live/test switching via PAYMENT_MODE).
 */
export const poojaOrders = async (req: Request, res: Response) => {
  try {
    const options = {
      amount: req.body.amount,
      currency: req.body.currency,
      receipt: "this is Puja Reciept",
      payment_capture: 1,
    };
    const response = await razorpay.orders.create(
      options as unknown as Parameters<typeof razorpay.orders.create>[0],
    );

    return res.json({
      order_id: response.id,
      currency: response.currency,
      amount: response.amount,
    });
  } catch (error) {
    logger.error({ err: error }, "Error creating legacy pooja Razorpay order");
    return res.status(500).send("there was an error ...");
  }
};

/** Fetches a Razorpay payment's status by id (legacy pooja checkout polling). */
export const poojaPayments = async (req: Request, res: Response) => {
  const paymentId = String(req.params.paymentId);

  try {
    const payment = await razorpay.payments.fetch(paymentId);

    if (!payment) {
      return res.status(500).json("Error while loading razorpay");
    }

    return res.json({
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching legacy pooja Razorpay payment");
    return res.status(500).json("Failed to fetch");
  }
};
