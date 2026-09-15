import express, { type Request, type Response } from "express";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import { errorHandler, notFoundHandler } from "./middleware/error";

// ── Module routers ────────────────────────────────────────────────────────────
import authRoutes from "./modules/users/auth.routes";
import userRoutes from "./modules/users/user.routes";
import poojaRoutes from "./modules/pooja/pooja.routes";
import poojaBookingRoutes from "./modules/pooja/poojaBooking.routes";
import pitruPujaRoutes from "./modules/pitru-puja/pitruPuja.routes";
import pitruPujaBookingRoutes from "./modules/pitru-puja/pitruPujaBooking.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import webhookRoutes from "./modules/payments/webhook.routes";
import promoRoutes from "./modules/promo/promo.routes";
import chadhavaRoutes from "./modules/chadhava/chadhava.routes";
import newChadhavaRoutes from "./modules/chadhava/newChadhava.routes";
import jyotirlingChadhavaRoutes from "./modules/chadhava/jyotirlingChadhava.routes";
import prasadRoutes from "./modules/prasad/prasad.routes";
import serviceabilityRoutes from "./modules/delivery/serviceability.routes";
import mandirRoutes from "./modules/mandir/mandir.routes";
import personalizedPoojaRoutes from "./modules/personalized-pooja/personalizedPooja.routes";
import appPersonalizedPoojaRoutes from "./modules/personalized-pooja/appPersonalizedPooja.routes";
import blogRoutes from "./modules/content/blog.routes";
import bannerRoutes from "./modules/content/banner.routes";
import godRoutes from "./modules/content/god.routes";
import libraryRoutes from "./modules/content/library.routes";
import videoProofRoutes from "./modules/content/videoProof.routes";
import feedbackRoutes from "./modules/content/feedback.routes";
import messageRoutes from "./modules/content/message.routes";
import jyotirlingaRoutes from "./modules/jyotirlinga/jyotirlinga.routes";
import jyotirlingaPlansRoutes from "./modules/jyotirlinga/plans.routes";
import jyotirlingaSubscriptionRoutes from "./modules/jyotirlinga/subscription.routes";
import charDhamRoutes from "./modules/yatra/charDham.routes";
import bbPackageRoutes from "./modules/yatra/bbPackage.routes";
import bbSevaRoutes from "./modules/yatra/bbSeva.routes";
import gauSevaRoutes from "./modules/yatra/gauSeva.routes";
import affiliateRoutes from "./modules/affiliate/affiliate.routes";
import configRoutes from "./modules/config/config.routes";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(compression());
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:4100",
  "https://vedicvaibhav.com",
  "http://vedicvaibhav.com",
  "https://www.vedicvaibhav.com",
  "https://dev.vedicvaibhav.com",
  "http://dev.vedicvaibhav.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Server-to-server / curl requests carry no Origin header.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-VERIFY",
      "X-MERCHANT-ID",
      "x-event-source-url",
      "x-fbp",
      "x-fbc",
    ],
  }),
);

/**
 * Razorpay webhooks verify an HMAC over the EXACT bytes Razorpay signed, so every
 * webhook path must be parsed with express.raw() here — before express.json().
 *
 * This ordering is load-bearing, not stylistic. Once express.json() parses a body
 * it sets `req._body`, and any express.raw() reached afterwards silently no-ops.
 * An inline `express.raw()` on the route itself therefore does NOT work: the
 * handler receives a parsed object, falls back to re-serializing it, and the
 * bytes no longer match the signature. That fails only for payloads which don't
 * survive a JSON.parse→stringify round-trip (non-ASCII escapes, number formats
 * like 1.50, key ordering) — so it looks fine in testing and rejects real traffic.
 *
 * Every new Razorpay webhook route must be added to this list.
 */
const rawJsonBody = express.raw({ type: "application/json" });
app.use("/api/webhook", rawJsonBody, webhookRoutes);
app.use("/api/v1/webhook", rawJsonBody, webhookRoutes);
// Webhook routes that live on feature routers mounted at "/" further down.
app.use("/razorpay/webhook", rawJsonBody); // pooja      → poojaBooking.routes.ts
app.use("/bb-seva/razorpay-webhook", rawJsonBody); // banke-bihari → bbSeva.routes.ts
// Note: gau-seva's webhook lives at /api/webhook/gau-seva-razorpay on a router
// mounted at "/", but the /api/webhook entry above is a prefix match, so it
// already receives the raw body — no separate entry needed.

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ── Routes (paths preserved from the legacy server for web + app clients) ─────
app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", poojaRoutes);
app.use("/", poojaBookingRoutes);
app.use("/", pitruPujaRoutes);
app.use("/", pitruPujaBookingRoutes);
app.use("/", paymentRoutes);
app.use("/", promoRoutes);
app.use("/", chadhavaRoutes);
app.use("/newChadhava", newChadhavaRoutes);
app.use("/api/jyotirling-chadhava", jyotirlingChadhavaRoutes);
app.use("/", prasadRoutes);
app.use("/serviceability", serviceabilityRoutes);
app.use("/", mandirRoutes);
app.use("/", personalizedPoojaRoutes);
app.use("/", appPersonalizedPoojaRoutes);
app.use("/", blogRoutes);
app.use("/banner", bannerRoutes);
app.use("/", godRoutes);
app.use("/", libraryRoutes);
app.use("/video-proofs", videoProofRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/", messageRoutes);
app.use("/jyotirlinga", jyotirlingaRoutes);
app.use("/plans", jyotirlingaPlansRoutes);
app.use("/jyotirlinga-subscription", jyotirlingaSubscriptionRoutes);
app.use("/", charDhamRoutes);
app.use("/", bbPackageRoutes);
app.use("/", bbSevaRoutes);
app.use("/", gauSevaRoutes);
app.use("/", affiliateRoutes);

// Client bootstrap: FX rates + the caller's geo-resolved country, one round trip.
app.use("/api/config", configRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.send("Vedic Vaibhav Server is running");
});
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
