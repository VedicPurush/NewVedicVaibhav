import express, { type Request, type Response } from "express";
import { Types } from "mongoose";

import { dbMain } from "../../config/db";
import { ApiError } from "../../lib/apiError";

/**
 * Email OTP login (POST /send-login-otp, POST /verify-login-otp) was removed —
 * mobile-number OTP is the only login method now (see modules/users/user.routes.ts:
 * /send-otp, /verify-otp, /phone-login-or-register). Its TempUser model and the
 * otpSmtp mailer went with it; nothing else referenced them.
 *
 * What remains here are the Pandit-ji-end operational endpoints.
 */
const authRouter = express.Router();

// FETCH BOOKED POOJAS ON PANDIT JI'S END
// (queried on the raw collection — the PoojaBooking model lives in the pooja module)
authRouter.get("/fetch-booked-poojas-on-panditJi-end/:mandirId", async (req: Request, res: Response) => {
  const { mandirId } = req.params;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookings = await dbMain
    .collection("poojaBookings")
    .find({
      mandirID: new Types.ObjectId(String(mandirId)),
      bookingDate: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    })
    .toArray();

  if (bookings.length === 0) {
    throw ApiError.notFound("No booked Poojas found for today at this Mandir.");
  }
  res.status(200).json({
    message: "Booked Poojas fetched successfully!",
    bookings,
  });
});

// UPDATE POOJA STATUS FROM PANDIT JI'S END
authRouter.post("/update-pooja-status-by-panditJi/:userId/:poojaId", async (req: Request, res: Response) => {
  const { userId, poojaId } = req.params;

  const booking = await dbMain.collection("poojaBookings").findOneAndUpdate(
    {
      userID: userId,
      poojaID: new Types.ObjectId(String(poojaId)),
      completed: false,
    },
    { $set: { completed: true, completeDate: new Date() } },
    { returnDocument: "after" },
  );

  if (!booking) {
    throw ApiError.badRequest(
      "Pooja is already completed or no such booking exists for the specified user and pooja.",
    );
  }
  res.status(200).json({
    message: "Pooja completed successfully!",
    booking,
  });
});

export default authRouter;
