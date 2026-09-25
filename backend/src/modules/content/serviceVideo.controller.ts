import type { Request, Response } from "express";
import ServiceVideo, { SERVICE_CHADHAVA, type IServiceVideo } from "./serviceVideo.model";
import { classifyService, rawServiceOf, serviceNameOf } from "./serviceVideo.helpers";
import NewChadhavaBooking from "../chadhava/newChadhavaBooking.model";
import { normalizePhone } from "../../config/currency";

/**
 * "ready" — there is a playable URL.
 * "coming_soon" — ops has filed the row for this booking but not the link yet.
 */
export type ServiceVideoStatus = "ready" | "coming_soon";

/** Shape returned to the web app / mobile app. */
interface ServiceVideoDto {
  _id: string;
  orderId: string;
  /** "chadhava", "puja", … — see `classifyService`. */
  service: string;
  /** The offering's own name, or "" when ops never recorded one. */
  serviceName: string;
  name: string;
  status: ServiceVideoStatus;
  /** Absolute and safe to hand to an <iframe>/parser. Empty when not ready. */
  videoUrl: string;
  /** The raw stored value, for debugging and for clients that parse it. */
  link: string;
  createdAt?: Date;
  /** Filled in from the booking when one belongs to this same devotee. */
  pujaTitle?: string;
  temple?: string;
  pujaDate?: Date;
}

/**
 * Turn whatever ops pasted into an absolute URL.
 *
 * Every row written so far stores a Drive path with the host stripped
 * ("file/d/<id>/view?usp=drive_link"), which no player can open. Full URLs and
 * bare hostnames are left alone; anything unrecognised is returned untouched
 * rather than guessed at, so a YouTube link never gets a Drive host bolted on.
 */
export const toAbsoluteVideoUrl = (raw: unknown): string => {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const path = value.replace(/^\/+/, "");
  if (/^(?:www\.)?(?:drive|docs)\.google\.com\//i.test(path)) return `https://${path.replace(/^www\./i, "")}`;
  if (/^(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(path)) return `https://${path.replace(/^www\./i, "")}`;
  // Host-less Drive path — the only form the admin tool has ever produced.
  if (/^(?:file|open|uc)\//i.test(path) || /^d\//i.test(path)) return `https://drive.google.com/${path}`;
  return value;
};

const toDto = (
  doc: IServiceVideo & { _id: unknown },
  service: string,
  serviceName: string,
): ServiceVideoDto => {
  const videoUrl = toAbsoluteVideoUrl(doc.link);
  /* Only an absolute http(s) URL is playable. `toAbsoluteVideoUrl` hands back
     anything it cannot place untouched, so a placeholder ops typed in the link
     column ("pending", "-", "NA") arrives here as-is and must not be offered as
     a video — it becomes "coming soon" along with a blank link. */
  const ready = /^https?:\/\//i.test(videoUrl);

  return {
    _id: String(doc._id),
    orderId: doc.orderId ?? "",
    service,
    serviceName,
    name: doc.name ?? "",
    status: ready ? "ready" : "coming_soon",
    videoUrl: ready ? videoUrl : "",
    link: doc.link ?? "",
    createdAt: doc.createdAt,
  };
};

/** `?service=` — defaults to chadhava, `all` turns the filter off entirely. */
const requestedService = (req: Request): string =>
  String(req.query.service ?? SERVICE_CHADHAVA).trim().toLowerCase();

/**
 * Name each video after the ritual it records, so a standalone page can show
 * "Ekadashi Special Shri Khatu Shyam Ji Chadhava" instead of a bare order id.
 *
 * Scoped to bookings belonging to THIS phone, which is a correctness rule and
 * not just caution: a handful of rows carry an order id that belongs to another
 * devotee's booking, and an unscoped join would print a stranger's puja title
 * (and temple) on this devotee's card. A hit also settles the row's service —
 * see `classifyService`.
 */
const titlesForOrderIds = async (
  orderIds: string[],
  phone: string,
): Promise<Map<string, { pujaTitle?: string; temple?: string; pujaDate?: Date }>> => {
  const map = new Map<string, { pujaTitle?: string; temple?: string; pujaDate?: Date }>();
  if (orderIds.length === 0) return map;

  const bookings = await NewChadhavaBooking.find({ orderID: { $in: orderIds }, whatsapp: phone })
    .select({ orderID: 1, "puja.chadhavaName": 1, "puja.mandir.nameEnglish": 1, "puja.date": 1 })
    .lean<
      {
        orderID?: string;
        puja?: { chadhavaName?: string; mandir?: { nameEnglish?: string }; date?: Date };
      }[]
    >();

  for (const b of bookings) {
    if (!b.orderID) continue;
    map.set(b.orderID, {
      pujaTitle: b.puja?.chadhavaName,
      temple: b.puja?.mandir?.nameEnglish,
      pujaDate: b.puja?.date,
    });
  }
  return map;
};

/**
 * GET /service-videos/by-phone/:phone?service=chadhava
 *
 * Every video delivered to one devotee, newest first. The profile matches them
 * to bookings by `orderId`; anything that matches nothing is still returned so
 * a video is never invisible just because its booking was archived.
 */
export const getServiceVideosByPhone = async (req: Request, res: Response): Promise<void> => {
  const phone = normalizePhone(req.params.phone);
  if (!phone) {
    res.status(400).json({ success: false, message: "Phone number is required" });
    return;
  }

  const service = requestedService(req);
  const docs = await ServiceVideo.find({ number: phone, isActive: true })
    .sort({ createdAt: -1 })
    .lean<(IServiceVideo & { _id: unknown })[]>();

  const titles = await titlesForOrderIds(
    docs.map((d) => d.orderId).filter(Boolean),
    phone,
  );

  /* The service filter runs here, through `classifyService`, and not in the
     query: rows the admin tool wrote before its fix hold the offering's name in
     `service`, so an exact match on "chadhava" dropped every such row from the
     profile while /my-videos (`all`, no filter) still showed it. One phone has
     a handful of rows, so filtering in memory costs nothing.

     No filter on videoUrl. A row with no link yet is ops saying "this booking's
     video is on its way", and the devotee is better told that than shown
     nothing — which is indistinguishable from us having forgotten them. */
  const videos: ServiceVideoDto[] = [];
  for (const doc of docs) {
    const booking = titles.get(doc.orderId);
    const raw = rawServiceOf(doc);
    const rowService = classifyService(raw, Boolean(booking));
    if (service !== "all" && rowService !== service) continue;
    videos.push({ ...toDto(doc, rowService, serviceNameOf(doc, raw)), ...booking });
  }

  res.status(200).json({ success: true, count: videos.length, videos });
};
