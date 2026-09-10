import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vedicvaibhav.com";

const staticPaths = [
  "/",
  "/services/puja",
  "/chadhava",
  "/services/12-jyotirlinga",
  "/services/new-jyotirling-chadhava",
  "/services/banke-bihariji",
  "/services/gau-seva",
  "/4-dham-yatra",
  "/sanatan-yatra",
  "/personalizedpuja",
  "/mandir",
  "/blogs",
  "/aarti",
  "/chalisa",
  "/suvichar",
  "/vedic-pathshala",
  "/video-proof",
  "/aboutus",
  "/contactus",
  "/termsandconditions",
  "/privacypolicy",
  "/refundpolicy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return staticPaths.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
