import type { Request, Response } from "express";
import Pooja from "./pooja.model";

/** Loose shape for `.lean()` pooja documents — the mandir-date transformation below
 *  rewrites nested arrays in place, exactly like the legacy controller did. */
type LeanPooja = Record<string, any>;

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Start of today — poojas stay bookable for the whole of their pooja day. */
const startOfToday = (): Date => {
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  return threshold;
};

/** Keeps only the earliest valid (>= threshold) date per mandir; null when none remain. */
const transformMandir = (mandir: LeanPooja | null, threshold: Date): LeanPooja | null => {
  if (!mandir) return null;

  const candidateDates: Date[] = ((mandir.poojaMandirDates as string[] | undefined) || [])
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const validDates = candidateDates.filter((date) => date >= threshold);
  if (validDates.length === 0) return null;

  const earliest = validDates[0];
  return {
    ...mandir,
    poojaMandirDates: [earliest.toISOString()],
    poojaMandirDays: [daysOfWeek[earliest.getDay()]],
  };
};

// API to fetch all active poojas with valid mandir dates, sorted by closest dates
export const fetchAllPoojas = async (_req: Request, res: Response) => {
  const threshold = startOfToday();

  // --- Step 1: Fetch in three priority groups ---
  const group1 = await Pooja.find({ isFeatured: true, isActive: true, isExclusive: true }).lean<LeanPooja[]>();
  group1.forEach((p) => (p.sortPriority = 1));

  const group2 = await Pooja.find({
    isActive: true,
    isExclusive: true,
    isFeatured: { $ne: true },
  }).lean<LeanPooja[]>();
  group2.forEach((p) => (p.sortPriority = 2));

  const group3 = await Pooja.find({ isActive: true, isExclusive: { $ne: true } }).lean<LeanPooja[]>();
  group3.forEach((p) => (p.sortPriority = 3));

  const combinedPoojas = [...group1, ...group2, ...group3];

  // --- Step 2: Process each pooja and determine its earliest valid date ---
  const processedPoojas = combinedPoojas
    .map((pooja): LeanPooja | null => {
      let earliestDateOfPooja: Date | null = null;
      const transformedMandirLists = (pooja.mandirLists as LeanPooja[]).map((mandir) => {
        const transformed = transformMandir(mandir, threshold);
        if (transformed) {
          const earliest = new Date(transformed.poojaMandirDates[0] as string);
          if (!earliestDateOfPooja || earliest < earliestDateOfPooja) {
            earliestDateOfPooja = earliest;
          }
        }
        return transformed;
      });

      const validMandirLists = transformedMandirLists.filter((m) => m !== null);
      if (validMandirLists.length === 0) return null;

      return {
        ...pooja,
        mandirLists: validMandirLists,
        earliestDate: earliestDateOfPooja, // attach for later sorting
      };
    })
    .filter((pooja): pooja is LeanPooja => pooja !== null);

  // --- Step 3: Sort by group priority, then by earliest date ---
  const sortedPoojas = processedPoojas.sort((a, b) => {
    if (a.sortPriority !== b.sortPriority) {
      return (a.sortPriority as number) - (b.sortPriority as number);
    }
    return new Date(a.earliestDate).getTime() - new Date(b.earliestDate).getTime();
  });

  return res.status(200).json({ poojas: sortedPoojas });
};

// API to fetch all active exclusive poojas with valid mandir dates
export const fetchAllExclusivePoojas = async (_req: Request, res: Response) => {
  const threshold = startOfToday();

  // High priority poojas: isFeatured, isExclusive and isActive
  const featuredExclusivePoojas = await Pooja.find({
    isFeatured: true,
    isExclusive: true,
    isActive: true,
  }).lean<LeanPooja[]>();

  let combinedPoojas = [...featuredExclusivePoojas];

  // If there are only one or two such poojas, supplement with additional ones
  if (featuredExclusivePoojas.length < 3) {
    const additionalExclusivePoojas = await Pooja.find({
      isExclusive: true,
      isActive: true,
      isFeatured: { $ne: true },
    }).lean<LeanPooja[]>();

    const filteredAdditional = additionalExclusivePoojas.filter(
      (item) => !featuredExclusivePoojas.some((fe) => String(fe._id) === String(item._id)),
    );

    combinedPoojas = [...featuredExclusivePoojas, ...filteredAdditional];
  }

  const result = combinedPoojas.map((pooja) => {
    const transformedMandirLists = (pooja.mandirLists as LeanPooja[]).map((mandir) =>
      transformMandir(mandir, threshold),
    );
    const validMandirLists = transformedMandirLists.filter((m) => m !== null);
    if (validMandirLists.length === 0) return null;
    return { ...pooja, mandirLists: validMandirLists };
  });

  const filteredResult = result.filter((r) => r !== null);

  return res.status(200).json({ poojas: filteredResult });
};

// API to fetch a specific pooja by ID
export const fetchPoojaById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const pooja = await Pooja.findById(id).populate("mandirLists.mandirId", "nameEnglish").exec();
  if (!pooja) {
    return res.status(404).json({ message: "Pooja not found." });
  }
  return res.status(200).json({ pooja });
};
