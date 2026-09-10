import type { Request, Response } from "express";
import type { AnyBulkWriteOperation } from "mongoose";
import ChadhavaData from "./fetchChadhava.model";
import PendingChadhavaBooking, {
  type IPendingChadhavaBooking,
} from "./pendingChadhavaBooking.model";
import ChadhavaBooking, { type IChadhavaBooking } from "./chadhava.model";

type AnyRec = Record<string, any>;

// --- READ ---
export const fetchAllChadhavas = async (req: Request, res: Response) => {
  const { sortBy = "newest", search = "" } = req.query;
  const sortOption: AnyRec = sortBy === "newest" ? { createdAt: -1 } : { createdAt: 1 };

  const query: AnyRec = {};
  if (search) {
    query.$or = [
      { chadhavaName: { $regex: search, $options: "i" } },
      { "mandirs.nameEnglish": { $regex: search, $options: "i" } },
    ];
  }

  const allChadhavas = await ChadhavaData.find(query).sort(sortOption);
  res.status(200).json({ success: true, data: allChadhavas });
};

export const fetchSpecialChadhavas = async (_req: Request, res: Response) => {
  const chadhavas = await ChadhavaData.find({}).sort({
    isExclusive: -1,
    isFeatured: -1,
    isActive: -1,
    createdAt: -1,
  });
  res.status(200).json({ success: true, data: chadhavas });
};

export const fetchChadhavaById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const chadhava = await ChadhavaData.findById(id);
  if (!chadhava) {
    return res.status(404).json({ success: false, message: "Chadhava not found" });
  }
  return res.status(200).json({ success: true, data: chadhava });
};

export const fetchChadhavaByMandirId = async (req: Request, res: Response) => {
  const { mandirId } = req.params;
  const chadhavas = await ChadhavaData.find({ "mandirs.mandirId": mandirId });
  res.status(200).json({ success: true, data: chadhavas });
};

export const fetchChadhavaByMandirNameID = async (req: Request, res: Response) => {
  const { nameID } = req.params;
  if (!nameID) {
    return res.status(400).json({ success: false, message: "Mandir nameID is required." });
  }
  const chadhavas = await ChadhavaData.find({ "mandirs.nameID": nameID });
  return res.status(200).json({ success: true, data: chadhavas });
};

// Default list (used if req.body.orderIDs not sent)
const DEFAULT_ORDER_IDS = [
  "CHAD1767575065206I7E3ZS",
  "CHAD17675620324779QYO3Y",
  "CHAD1767522050001BA2VE3",
  "CHAD17673584134923X56OQ",
  "CHAD17671468289992KUH7M",
  "CHAD17675505991552Q7DPR",
  "CHAD17674603541256E2SY7",
  "CHAD17675987004177KPAXX",
];

function mapPendingToMainDoc(p: IPendingChadhavaBooking, now: Date): Partial<IChadhavaBooking> {
  const bd = (p.bookingDetails || {}) as AnyRec;
  const address = (bd.address || {}) as AnyRec;
  const pujaIn = (bd.puja || {}) as AnyRec;

  const name = (bd.name as string) || (address.name as string) || "";
  const whatsapp = (bd.whatsapp as string) || (address.number as string) || "";

  const puja = {
    title: (pujaIn.title as string) || (pujaIn.name as string) || "Puja",
    temple: (pujaIn.temple as string) || (pujaIn.mandir as string) || "",
    date: pujaIn.date ? new Date(pujaIn.date) : new Date(),
  };

  return {
    userID: String(bd.userID || ""),
    transactionID: bd.transactionID ? String(bd.transactionID) : undefined,
    orderID: p.orderID,
    name,
    whatsapp,
    puja: puja as IChadhavaBooking["puja"],
    accessories: Array.isArray(bd.accessories) ? bd.accessories : [],
    prasad: bd.prasad,
    address: address as IChadhavaBooking["address"],
    totalPrice: Number(bd.totalPrice ?? 0),
    familyMembers: Array.isArray(bd.familyMembers) ? bd.familyMembers.map(String) : [],
    gotra: typeof bd.gotra === "string" ? bd.gotra : (bd.gotra ?? null),
    bookingDate: p.createdAt ? new Date(p.createdAt) : now,
    // NOTE: status/statusDate are applied via $set (not $setOnInsert) to avoid path conflicts
    status: "confirmed",
    statusDate: now,
    referralCode: bd.referralCode ? String(bd.referralCode) : null,
  } as Partial<IChadhavaBooking>;
}

// ------------------------------------------------------------------
// STEP 1: Fetch pending docs for given orderIDs that are NOT in main yet
// POST /chadhava-bookings/pending-only
// Body: { orderIDs?: string[] }  (optional; defaults to the list above)
// ------------------------------------------------------------------
export const findPendingNotInMain = async (req: Request, res: Response) => {
  const body = req.body as AnyRec;
  const orderIDs: string[] =
    Array.isArray(body?.orderIDs) && body.orderIDs.length
      ? body.orderIDs.map(String)
      : DEFAULT_ORDER_IDS;

  const [pending, mainExisting] = await Promise.all([
    PendingChadhavaBooking.find({ orderID: { $in: orderIDs } }).lean(),
    ChadhavaBooking.find({ orderID: { $in: orderIDs } }, { orderID: 1 }).lean(),
  ]);

  const mainSet = new Set(mainExisting.map((d) => d.orderID));
  const notInMain = pending.filter((p) => !mainSet.has(p.orderID));
  const alreadyInMain = pending.filter((p) => mainSet.has(p.orderID));

  res.status(200).json({
    success: true,
    requestedCount: orderIDs.length,
    foundInPending: pending.length,
    alreadyInMainCount: alreadyInMain.length,
    notInMainCount: notInMain.length,
    alreadyInMainOrderIDs: alreadyInMain.map((p) => p.orderID),
    data: notInMain, // full docs to inspect if needed
  });
};

// ------------------------------------------------------------------
// STEP 2: Append those pending into main (upsert) & set both statuses confirmed
// POST /chadhava-pending/append
// Body: { orderIDs?: string[] }  (optional; defaults to the list above)
// ------------------------------------------------------------------
export const appendConvertedPendingToMain = async (req: Request, res: Response) => {
  const body = req.body as AnyRec;
  const orderIDs: string[] =
    Array.isArray(body?.orderIDs) && body.orderIDs.length
      ? body.orderIDs.map(String)
      : DEFAULT_ORDER_IDS;

  const now = new Date();

  const [pendings, mainExisting] = await Promise.all([
    PendingChadhavaBooking.find({ orderID: { $in: orderIDs } }).lean(),
    ChadhavaBooking.find({ orderID: { $in: orderIDs } }, { orderID: 1 }).lean(),
  ]);

  const mainOrderSet = new Set(mainExisting.map((m) => String(m.orderID)));
  const requestedSet = new Set(orderIDs);

  const upsertOps = pendings.map((p) => {
    const fullDoc = mapPendingToMainDoc(p as unknown as IPendingChadhavaBooking, now);
    // EXCLUDE status/statusDate from $setOnInsert to avoid conflict with $set
    const { status: _status, statusDate: _statusDate, ...insertOnly } = fullDoc as AnyRec;

    return {
      updateOne: {
        filter: { orderID: p.orderID },
        update: {
          $setOnInsert: insertOnly, // insert-only fields
          $set: { status: "confirmed", statusDate: now }, // insert & update
        },
        upsert: true,
      },
    };
  });

  const bulkResult = upsertOps.length
    ? await ChadhavaBooking.bulkWrite(
        upsertOps as unknown as AnyBulkWriteOperation<IChadhavaBooking>[],
        { ordered: false },
      )
    : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0, upsertedIds: {} as AnyRec };

  // Flip pending -> confirmed
  await PendingChadhavaBooking.updateMany(
    { orderID: { $in: orderIDs } },
    { $set: { status: "confirmed", updatedAt: now } },
  );

  const upsertedIds = (bulkResult as AnyRec).upsertedIds || {};
  const insertedOrderIDs = Object.values(upsertedIds).length
    ? Object.values(upsertedIds).map((v) => String(v))
    : [];

  const alreadyInMain = pendings
    .filter((p) => mainOrderSet.has(String(p.orderID)))
    .map((p) => p.orderID);
  const foundInPendingIDs = new Set(pendings.map((p) => p.orderID));
  const missingInPending = Array.from(requestedSet).filter((id) => !foundInPendingIDs.has(id));

  res.status(200).json({
    ok: true,
    summary: {
      totalRequested: orderIDs.length,
      totalFoundInPending: pendings.length,
      totalAlreadyInMain: alreadyInMain.length,
      totalAttemptedInsert: upsertOps.length,
      totalInserted: (bulkResult as AnyRec).upsertedCount || 0,
      totalMissingInPending: missingInPending.length,
    },
    details: {
      alreadyInMain,
      insertedOrderIDs,
      missingInPending,
    },
  });
};

// ------------------------------------------------------------------
// STEP 3: Only confirm statuses for given orderIDs in BOTH collections
// POST /chadhava-bookings/confirm
// Body: { orderIDs?: string[] }  (optional; defaults to the list above)
// ------------------------------------------------------------------
export const confirmChadhavaOrders = async (req: Request, res: Response) => {
  const body = req.body as AnyRec;
  const orderIDs: string[] =
    Array.isArray(body?.orderIDs) && body.orderIDs.length
      ? body.orderIDs.map(String)
      : DEFAULT_ORDER_IDS;

  const now = new Date();

  const [mainRes, pendingRes] = await Promise.all([
    ChadhavaBooking.updateMany(
      { orderID: { $in: orderIDs } },
      { $set: { status: "confirmed", statusDate: now, updatedAt: now } },
    ),
    PendingChadhavaBooking.updateMany(
      { orderID: { $in: orderIDs } },
      { $set: { status: "confirmed", updatedAt: now } },
    ),
  ]);

  res.status(200).json({
    ok: true,
    message: "Statuses set to confirmed where documents exist.",
    counts: {
      mainModified: mainRes.modifiedCount,
      pendingModified: pendingRes.modifiedCount,
    },
  });
};
