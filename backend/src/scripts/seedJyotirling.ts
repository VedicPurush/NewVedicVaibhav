/**
 * Seed the Jyotirling Chadhava configuration (banners, 12 temples, offerings)
 * into the main Vedic Vaibhav database. Replaces any existing configuration.
 *
 * Run from the backend/ folder:
 *   pnpm tsx src/scripts/seedJyotirling.ts
 */

import { dbMain } from "../config/db";
import { logger } from "../lib/logger";
import JyotirlingChadhavaData from "../modules/chadhava/jyotirlingChadhavaData.model";

const CDN = "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav";

const seedData = async (): Promise<void> => {
  try {
    logger.info("Connecting to MongoDB (main)...");
    await dbMain.asPromise();

    logger.info("Connected! Checking for existing configuration...");

    // Check if data already exists
    const existing = await JyotirlingChadhavaData.findOne({ isActive: true });
    if (existing) {
      logger.info(
        "Active configuration already exists. Removing it to replace with fresh seed data...",
      );
      await JyotirlingChadhavaData.deleteMany({});
    }

    const dummyData = {
      topBannerImage: {
        location: `${CDN}/home-images/prem_mandir.png`,
        filename: "prem_mandir.png",
      },
      bottomBannerImage: {
        location: `${CDN}/home-images/kedarnath.png`,
        filename: "kedarnath.png",
      },
      mobileBannerImage: { location: "" },
      desktopBannerImage: { location: "" },
      bannerTitle: "12 Jyotirlinga Darshan & Chadhava",
      bannerSubtitle: "Offer sacred items to Lord Shiva directly at all 12 Jyotirlingas",
      // NOTE: key kept exactly as in the legacy seed — it does not match the schema's
      // `bannerCtaText` path, so Mongoose drops it (legacy parity).
      bannerCTAText: "Book Seva Now",
      isActive: true,

      jyotirlingTemples: [
        { id: "somnath", nameEnglish: "Somnath", location: "Gujarat", defaultMonth: 0, defaultDate: 15, image: { location: `${CDN}/Jyotirling/somnath.jpg` } },
        { id: "mallikarjuna", nameEnglish: "Mallikarjuna", location: "Andhra Pradesh", defaultMonth: 1, defaultDate: 15, image: { location: `${CDN}/Jyotirling/mallikarjuna.jpg` } },
        { id: "mahakaleshwar", nameEnglish: "Mahakaleshwar", location: "Madhya Pradesh", defaultMonth: 2, defaultDate: 15, image: { location: `${CDN}/Jyotirling/mahakaleshwar.jpg` } },
        { id: "omkareshwar", nameEnglish: "Omkareshwar", location: "Madhya Pradesh", defaultMonth: 3, defaultDate: 15, image: { location: `${CDN}/Jyotirling/omkareshwar.jpg` } },
        { id: "kedarnath", nameEnglish: "Kedarnath", location: "Uttarakhand", defaultMonth: 4, defaultDate: 15, image: { location: `${CDN}/Jyotirling/kedarnath.jpg` } },
        { id: "bhimashankar", nameEnglish: "Bhimashankar", location: "Maharashtra", defaultMonth: 5, defaultDate: 15, image: { location: `${CDN}/Jyotirling/bhimashankar.jpg` } },
        { id: "trimbakeshwar", nameEnglish: "Trimbakeshwar", location: "Maharashtra", defaultMonth: 6, defaultDate: 15, image: { location: `${CDN}/Jyotirling/trimbakeshwar.jpg` } },
        { id: "kashi-vishwanath", nameEnglish: "Kashi Vishwanath", location: "Uttar Pradesh", defaultMonth: 7, defaultDate: 15, image: { location: `${CDN}/Jyotirling/kashi.jpg` } },
        { id: "baidyanath", nameEnglish: "Baidyanath", location: "Jharkhand", defaultMonth: 8, defaultDate: 15, image: { location: `${CDN}/Jyotirling/baidyanath.jpg` } },
        { id: "nageshwar", nameEnglish: "Nageshwar", location: "Gujarat", defaultMonth: 9, defaultDate: 15, image: { location: `${CDN}/Jyotirling/nageshwar.jpg` } },
        { id: "rameshwaram", nameEnglish: "Rameshwaram", location: "Tamil Nadu", defaultMonth: 10, defaultDate: 15, image: { location: `${CDN}/Jyotirling/rameshwaram.jpg` } },
        { id: "grishneshwar", nameEnglish: "Grishneshwar", location: "Maharashtra", defaultMonth: 11, defaultDate: 15, image: { location: `${CDN}/Jyotirling/grishneshwar.jpg` } },
      ],

      // NOTE: `description` / `badge` keys kept exactly as in the legacy seed — they do
      // not match the schema (shortDescription/fullDescription), so Mongoose drops them
      // (legacy parity).
      chadhavaOfferings: [
        {
          id: "bel-patra",
          name: "Bel Patra",
          description:
            "Sacred three-leafed offering most beloved by Lord Shiva. Symbolises the Holy Trinity.",
          price: 51,
          originalPrice: 71,
          image: { location: `${CDN}/Chadhava/bel_patra.png` },
          badge: "Most Popular",
        },
        {
          id: "panchamrit",
          name: "Panchamrit Abhishek",
          description:
            "A holy blend of Milk, Curd, Ghee, Honey, and Sugar offered directly onto the Shiva Linga.",
          price: 151,
          originalPrice: 201,
          image: { location: `${CDN}/Chadhava/panchamrit.png` },
          badge: "Recommended",
        },
        {
          id: "special-shringar",
          name: "Special Shringar & Flowers",
          description:
            "Elaborate decoration of the Shiva Linga with fresh marigold, rose garlands, chandan paste, and bhaang.",
          price: 251,
          originalPrice: 351,
          image: { location: `${CDN}/Chadhava/shringar.png` },
          badge: "Premium Seva",
        },
      ],
    };

    await JyotirlingChadhavaData.create(dummyData);
    logger.info("Successfully seeded Jyotirling Chadhava Data into VedicVaibhavMain!");

    // Explicitly close the connection and exit
    await dbMain.close();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error seeding data");
    process.exit(1);
  }
};

void seedData();
