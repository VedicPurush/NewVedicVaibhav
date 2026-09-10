import type { Request, Response } from "express";
import type { Types } from "mongoose";
import { ApiError } from "../../lib/apiError";
import { logger } from "../../lib/logger";
import Pooja from "../pooja/pooja.model";
import Mandir from "../mandir/mandir.model";
import ChadhavaData from "../chadhava/fetchChadhava.model";
import NewChadhavaData from "../chadhava/newChadhavaData.model";
import Jyotirlinga from "../jyotirlinga/jyotirlinga.model";

/**
 * Public site origin used to build the absolute `link` each existing consumer
 * already reads. The legacy env override VV_SITE_ORIGIN has no equivalent in
 * the new config (see port report).
 */
const VV_SITE_ORIGIN = "https://vedicvaibhav.com";

/** lodash.escapeRegExp equivalent (no lodash dependency). */
const escapeRegExp = (value: string): string => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

// Interface for the unified search result structure
interface IUnifiedSearchResult {
  id: string;
  name: string;
  image: string;
  link: string;
  department: "POOJAS" | "MANDIRS" | "PRODUCTS" | "CHADHAVAS";
  // Commission fields for Products
  promoterPartnerComission?: number;
  partnerComission?: number;
  affiliateComission?: number;
  // Site-RELATIVE path + a human category + the platform code — the partner
  // dashboard prefixes `path` with the correct website origin for its
  // environment and appends the sharer's `?ref=`.
  path: string;
  category: string;
  platform: "VEDIC_VAIBHAV";
}

type PoojaSearchDoc = {
  _id: Types.ObjectId;
  title?: string;
  poojaCardImage?: string;
  images?: string[];
  mandirLists?: Array<{ poojaMandirDates?: unknown[] } | null>;
};

type MandirSearchDoc = {
  _id: Types.ObjectId;
  nameEnglish?: string;
  prasadCardImage?: string;
  mandirIntroImage?: string;
  images?: string[];
};

type FileMetaish = string | { location?: string } | null | undefined;

type ChadhavaSearchDoc = {
  _id: Types.ObjectId;
  chadhavaName?: string;
  chadhavaWebCardImage?: FileMetaish;
  chadhavaAppImage?: FileMetaish;
  chadhavaInnerImages?: FileMetaish[];
  availableDates?: unknown[];
  createdAt?: Date;
};

type JyotirlingaDoc = {
  _id: Types.ObjectId;
  nameEnglish?: string;
  nameHindi?: string;
  image?: string;
  price?: number;
  monthNumber?: number;
};

/**
 * Ranks already-matched results so the "best" suggestions surface first: an exact or
 * starts-with match on the search term outranks a match that only occurs mid-string/in a
 * secondary field (e.g. description). Array.prototype.sort is stable, so relative DB order
 * is preserved within each rank tier.
 */
function rankByRelevance<T>(items: T[], query: string, getName: (item: T) => string | undefined): T[] {
  const q = query.trim().toLowerCase();
  const rank = (item: T): number => {
    const name = (getName(item) || "").toLowerCase();
    if (name === q) return 0; // exact match
    if (name.startsWith(q)) return 1; // starts with query
    if (name.includes(q)) return 2; // query appears in name
    return 3; // matched on a different field only
  };
  return [...items].sort((a, b) => rank(a) - rank(b));
}

const fileLoc = (v: FileMetaish): string => (v && typeof v === "object" ? v.location || "" : v || "");

export const unifiedSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const limitPerCategory = 5; // Final suggestions returned per category
    const fetchLimit = 20; // Wider candidate pool so relevance ranking has something to work with
    const currentDate = new Date();

    if (!query || query.trim().length < 2) {
      res.json([]);
      return;
    }

    // Case-insensitive regular expression from the user's query
    const searchRegex = new RegExp(escapeRegExp(query), "i");

    const [poojaResults, mandirResults, chadhavaResults, newChadhavaResults] = await Promise.all([
      // Search Poojas using regex
      Pooja.find({
        isActive: true,
        $or: [
          { title: searchRegex },
          { titleHindi: searchRegex },
          { poojaGod: searchRegex },
          { poojaDescription: searchRegex },
        ],
      })
        .limit(fetchLimit)
        .lean<PoojaSearchDoc[]>(),

      // Search Mandirs using regex
      Mandir.find({
        isActive: true,
        $or: [
          { nameEnglish: searchRegex },
          { nameHindi: searchRegex },
          { godName: searchRegex },
          { city: searchRegex },
          { state: searchRegex },
        ],
      })
        .limit(fetchLimit)
        .lean<MandirSearchDoc[]>(),

      // Search legacy Chadhavas with date and isActive check
      ChadhavaData.find({
        isActive: true,
        availableDates: { $gte: currentDate },
        $or: [{ chadhavaName: searchRegex }, { descriptionName: searchRegex }, { description: searchRegex }],
      })
        .limit(fetchLimit)
        .lean<ChadhavaSearchDoc[]>(),

      // The LIVE chadhava detail page reads NewChadhavaData, not the legacy
      // ChadhavaData searched above — search BOTH and prefer the new-collection
      // row when the same chadhava appears in each, so links actually resolve.
      // availableDates here is string[] ("YYYY-MM-DD"), so the date window is
      // applied in JS below rather than as a $gte on a Date.
      NewChadhavaData.find({
        isActive: true,
        $or: [{ chadhavaName: searchRegex }, { descriptionName: searchRegex }, { description: searchRegex }],
      })
        .select("chadhavaName chadhavaWebCardImage chadhavaAppImage chadhavaInnerImages availableDates isActive")
        .limit(fetchLimit)
        .lean<ChadhavaSearchDoc[]>()
        .catch((e: unknown) => {
          logger.error({ err: e }, "[unifiedSearch] NewChadhavaData query failed");
          return [] as ChadhavaSearchDoc[];
        }),
    ]);

    // Map Pooja results to the unified format
    const mappedPoojas: IUnifiedSearchResult[] = poojaResults.map((p) => {
      const path = `/services/puja/${p._id}/select-package`;
      return {
        id: p._id.toString(),
        name: p.title || "",
        image: p.poojaCardImage || (p.images && p.images[0]) || "",
        department: "POOJAS" as const,
        link: `${VV_SITE_ORIGIN}${path}`,
        path,
        category: "Book Pooja",
        platform: "VEDIC_VAIBHAV" as const,
      };
    });

    // Map Mandir results to the unified format
    const mappedMandirs: IUnifiedSearchResult[] = mandirResults.map((m) => {
      const path = `/mandir/${m._id}`;
      return {
        id: m._id.toString(),
        name: m.nameEnglish || "",
        image: m.prasadCardImage || m.mandirIntroImage || (m.images && m.images[0]) || "",
        department: "MANDIRS" as const,
        link: `${VV_SITE_ORIGIN}${path}`,
        path,
        category: "Mandir",
        platform: "VEDIC_VAIBHAV" as const,
      };
    });

    // Shop products lived in the Ecom database, which is not part of this
    // backend — the PRODUCTS department is no longer served (see port report).
    const mappedProducts: IUnifiedSearchResult[] = [];

    // Map Chadhava results to the unified format: NewChadhavaData first (its ids
    // are the ones the live detail page can resolve), then any legacy
    // ChadhavaData row whose name isn't already covered. Date window mirrors the
    // live /chadhava page: keep the row if it has no first availableDate, or
    // "now" is on/before end-of-day of that date.
    const chadhavaDateOk = (c: ChadhavaSearchDoc): boolean => {
      const first = Array.isArray(c?.availableDates) ? c.availableDates[0] : undefined;
      if (!first) return true;
      const d = new Date(first as string);
      if (isNaN(d.getTime())) return true;
      d.setHours(23, 59, 59, 999);
      return currentDate <= d;
    };

    const mappedNewChadhavas: IUnifiedSearchResult[] = newChadhavaResults.filter(chadhavaDateOk).map((c) => {
      const path = `/chadhava/detail/${c._id}`;
      return {
        id: c._id.toString(),
        name: c.chadhavaName || "",
        image:
          fileLoc(c.chadhavaWebCardImage) ||
          fileLoc(c.chadhavaAppImage) ||
          (Array.isArray(c.chadhavaInnerImages) ? fileLoc(c.chadhavaInnerImages[0]) : "") ||
          "",
        department: "CHADHAVAS" as const,
        link: `${VV_SITE_ORIGIN}${path}`,
        path,
        category: "Chadhava",
        platform: "VEDIC_VAIBHAV" as const,
      };
    });

    const seenChadhavaNames = new Set(mappedNewChadhavas.map((c) => String(c.name || "").trim().toLowerCase()));

    const mappedLegacyChadhavas: IUnifiedSearchResult[] = chadhavaResults
      .filter((c) => !seenChadhavaNames.has(String(c.chadhavaName || "").trim().toLowerCase()))
      .map((c) => {
        const path = `/chadhava/detail/${c._id}`;
        return {
          id: c._id.toString(),
          name: c.chadhavaName || "",
          image: fileLoc(c.chadhavaWebCardImage) || fileLoc(c.chadhavaAppImage) || "",
          department: "CHADHAVAS" as const,
          link: `${VV_SITE_ORIGIN}${path}`,
          path,
          category: "Chadhava",
          platform: "VEDIC_VAIBHAV" as const,
        };
      });

    const mappedChadhavas: IUnifiedSearchResult[] = [...mappedNewChadhavas, ...mappedLegacyChadhavas];

    // Rank each category by relevance to the query, then trim down to the final
    // per-category suggestion count.
    const getName = (item: IUnifiedSearchResult) => item.name;
    const combinedResults = [
      ...rankByRelevance(mappedPoojas, query, getName).slice(0, limitPerCategory),
      ...rankByRelevance(mappedMandirs, query, getName).slice(0, limitPerCategory),
      ...rankByRelevance(mappedProducts, query, getName).slice(0, limitPerCategory),
      ...rankByRelevance(mappedChadhavas, query, getName).slice(0, limitPerCategory),
    ];

    res.status(200).json(combinedResults);
  } catch (error) {
    logger.error({ err: error }, "Error during unified search");
    throw new ApiError(500, "Server error during search.");
  }
};

/**
 * Active shareable products for the partner/affiliate dashboard (no search query — a listing).
 *
 * Vedic Vaibhav is grouped into sub-sections via each item's `category`: Book Pooja, Chadhava,
 * 12 Jyotirlinga (individual lingas, all pointing at the single 12-jyotirlinga journey), plus the
 * landing-page sevas Banke Bihari, 4 Dham and 4 Dham Yatra. The ecommerce shop is intentionally
 * EXCLUDED here (vedicvaibhav.com/shop is not part of this listing).
 *
 * `path` is site-relative on purpose: the dashboard prefixes it with the correct website origin
 * (local vs production, from its own env) and appends the sharer's `?ref=` code. Read-only, lean,
 * hard-limited so it stays fast even under load.
 */
export const activeProductsForAffiliate = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Mirror the website's book-pooja logic exactly: a pooja is "live" only if
    // it is active AND has at least one mandir date on/after start-of-today.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [poojasRaw, chadhavasRaw, jyotirlingas] = await Promise.all([
      Pooja.find({ isActive: true })
        .select("title poojaCardImage images mandirLists.poojaMandirDates")
        .limit(200)
        .lean<PoojaSearchDoc[]>(),
      // Chadhava — the LIVE /chadhava page reads NewChadhavaData and filters
      // client-side to active chadhavas whose first available date hasn't
      // passed. Fetch active at the DB, filter dates in JS.
      NewChadhavaData.find({ isActive: true })
        .select("chadhavaName chadhavaWebCardImage chadhavaInnerImages availableDates isActive createdAt")
        .limit(150)
        .lean<ChadhavaSearchDoc[]>(),
      // 12 Jyotirlinga — all twelve lingas, in month order.
      Jyotirlinga.find({})
        .select("nameEnglish nameHindi image price monthNumber")
        .sort({ monthNumber: 1 })
        .limit(20)
        .lean<JyotirlingaDoc[]>(),
    ]);

    const poojas = poojasRaw.filter(
      (p) =>
        Array.isArray(p.mandirLists) &&
        p.mandirLists.some(
          (m) =>
            m &&
            Array.isArray(m.poojaMandirDates) &&
            m.poojaMandirDates.some((d) => {
              const dt = new Date(d as string);
              return !isNaN(dt.getTime()) && dt >= startOfToday;
            }),
        ),
    );

    // Chadhava date filter — keep a chadhava if its first availableDate is
    // missing/invalid, OR "now" is on/before end-of-day of that date. Then sort
    // ascending by the first available date so the soonest offerings surface first.
    const now = new Date();
    const chadhavas = chadhavasRaw
      .filter((c) => {
        const dateStr = Array.isArray(c.availableDates) ? c.availableDates[0] : undefined;
        if (!dateStr) return true;
        const d = new Date(dateStr as string);
        if (isNaN(d.getTime())) return true;
        d.setHours(23, 59, 59, 999);
        return now <= d;
      })
      .sort((a, b) => {
        const da = a.availableDates && a.availableDates[0] ? new Date(a.availableDates[0] as string).getTime() : Infinity;
        const db = b.availableDates && b.availableDates[0] ? new Date(b.availableDates[0] as string).getTime() : Infinity;
        return da - db;
      });

    const items = [
      // Book Pooja — individual poojas, each with its own package-selection page.
      ...poojas.map((p) => ({
        id: String(p._id),
        name: p.title || "",
        image: p.poojaCardImage || (p.images && p.images[0]) || "",
        category: "Book Pooja",
        path: `/services/puja/${p._id}/select-package`,
      })),
      // Chadhava — individual chadhavas, each with its own detail page. Image is
      // an IFileMeta object ({ location }) on NewChadhavaData, not a plain string.
      ...chadhavas.map((c) => ({
        id: String(c._id),
        name: c.chadhavaName || "",
        image:
          fileLoc(c.chadhavaWebCardImage) ||
          (Array.isArray(c.chadhavaInnerImages) ? fileLoc(c.chadhavaInnerImages[0]) : "") ||
          "",
        category: "Chadhava",
        path: `/chadhava/detail/${c._id}`,
      })),
      // 12 Jyotirlinga — the primary offering is the full 12-linga package
      // (monthly seva); the page also lets users pick individual lingas. Both
      // share the /services/12-jyotirlinga page. Package card first, then each linga.
      {
        id: "vv-12-jyotirlinga-package",
        name: "Full Jyotirling Package",
        image: jyotirlingas[0]?.image || "",
        category: "12 Jyotirlinga",
        path: `/services/12-jyotirlinga`,
      },
      ...jyotirlingas.map((j) => ({
        id: String(j._id),
        name: j.nameEnglish || j.nameHindi || "",
        image: j.image || "",
        category: "12 Jyotirlinga",
        price: typeof j.price === "number" ? j.price : undefined,
        path: `/services/12-jyotirlinga`,
      })),
      // Landing-page sevas — one shareable card each (always-on offerings).
      {
        id: "vv-banke-bihari",
        name: "Shri Banke Bihari Ji Seva",
        image: "",
        category: "Banke Bihari",
        path: "/services/puja/shri-banke-bihari-puja",
      },
      {
        id: "vv-4-dham",
        name: "4 Dham",
        image: "",
        category: "4 Dham",
        path: "/4-dham-yatra",
      },
      {
        id: "vv-4-dham-yatra",
        name: "4 Dham Yatra",
        image: "",
        category: "4 Dham Yatra",
        path: "/4-dham-yatra",
      },
    ].filter((it) => it.name && it.path);

    res.status(200).json({ platform: "VEDIC_VAIBHAV", count: items.length, items });
  } catch (error) {
    logger.error({ err: error }, "Error fetching active products");
    res.status(500).json({ platform: "VEDIC_VAIBHAV", count: 0, items: [] });
  }
};
