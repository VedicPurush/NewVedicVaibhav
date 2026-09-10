import { Schema, Types, type Model } from "mongoose";
import { dbMain } from "../../config/db";

/**
 * App PEER-referral reward ledger (store credit).
 *
 * When a plain app CUSTOMER refers the app to a friend and that friend places an APP order, the
 * referrer earns a store-credit reward = appReferralRewardPercent% of the order (admin-editable in
 * the partner-affiliate super admin; fetched via GET /commission-config). This is SEPARATE from
 * partner-affiliate wallet commission: partner/affiliate/promoter referral codes route to the
 * commission engine instead (decided by the GET /referral-code-type lookup) and never create a row
 * here — so any single order is paid exactly once, to exactly one place.
 *
 * Each row is one accrual tied to exactly one order (unique orderId => idempotent: a duplicate or
 * retried booking push can't double-credit). Redemption spends the balance as store credit at
 * checkout and is tracked via redeemedAmount/status — rows are never deleted, giving a full audit
 * trail.
 */
export type AppReferralRewardStatus = "PENDING" | "REDEEMED" | "CANCELLED";

export interface IAppReferralReward {
  _id?: Types.ObjectId;
  /** 'VEDIC_VAIBHAV' */
  platform: string;
  /** the referring customer's app referral code (who earns the reward) */
  referrerCode: string;
  /** the friend who placed the order */
  referredUserId?: Types.ObjectId | null;
  /** the friend's phone (reference/debug) */
  referredPhone?: string | null;
  /** source order id (unique => idempotency) */
  orderId: string;
  /** BOOK_POOJA | CHADHAVA | ONLINE_PRASAD */
  department?: string | null;
  /** order grand total the reward was computed from */
  orderAmount: number;
  /** % applied at accrual time (snapshot of the admin config) */
  rewardPercent: number;
  /** orderAmount * rewardPercent / 100 (credit accrued) */
  rewardAmount: number;
  /** how much of rewardAmount has been spent as store credit */
  redeemedAmount: number;
  status: AppReferralRewardStatus;
  /** orders this credit was applied to (audit) */
  redemptionOrderIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const schema = new Schema<IAppReferralReward>(
  {
    platform: { type: String, required: true, default: "VEDIC_VAIBHAV", index: true },
    referrerCode: { type: String, required: true, index: true },
    referredUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    referredPhone: { type: String, default: null },
    orderId: { type: String, required: true, unique: true },
    department: { type: String, default: null },
    orderAmount: { type: Number, required: true, min: 0 },
    rewardPercent: { type: Number, required: true, min: 0 },
    rewardAmount: { type: Number, required: true, min: 0 },
    redeemedAmount: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["PENDING", "REDEEMED", "CANCELLED"],
      default: "PENDING",
      index: true,
    },
    redemptionOrderIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Fast "available balance for this referrer" lookups.
schema.index({ referrerCode: 1, status: 1 });

const AppReferralReward: Model<IAppReferralReward> = dbMain.model<IAppReferralReward>(
  "AppReferralReward",
  schema,
  "app_referral_rewards",
);

export default AppReferralReward;
