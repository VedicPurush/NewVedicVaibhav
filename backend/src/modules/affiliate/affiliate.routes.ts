import { Router } from "express";
import { createUser, listUsers, getUser, updateUser, deleteUser } from "./affiliatePartner.controller";
import { unifiedSearch, activeProductsForAffiliate } from "./search.controller";
import { getAllOrdersForPartnerAffiliate } from "./fetchOrders.controller";

const router = Router();

// Partner/affiliate registration CRUD
router.post("/create-affiliatePartner", createUser);
router.get("/getAll-affiliatePartner", listUsers);
router.get("/get-affiliatePartner-byId/:id", getUser);
router.put("/update-affiliatePartner/:id", updateUser);
router.delete("/delete-affiliatePartner/:id", deleteUser);

// GET /get-allOrders-for-partnerAffiliate           → every referral order
// GET ...?limit=50                                  → first 50 only
// GET ...?limit=all&sort=asc                        → everything, oldest → newest
router.get("/get-allOrders-for-partnerAffiliate", getAllOrdersForPartnerAffiliate);

router.get("/search", unifiedSearch);

// Active shareable products (poojas, chadhavas) for the partner/affiliate dashboard listing.
router.get("/active-products", activeProductsForAffiliate);

// The APP-only POST /link-app-referral route was removed: it wrote User.referredByCode,
// which nothing in this backend ever read, and production had 0 users linked and 0 rows in
// app_referral_rewards. Per-order referral rewards are unaffected — they resolve from the
// booking's own referralCode via utils/partnerAffiliateReferralCap.ts.

export default router;
