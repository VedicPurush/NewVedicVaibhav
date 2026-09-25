import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** One delivered ritual video, as returned by GET /service-videos/by-phone. */
export interface ServiceVideo {
  _id: string;
  /** The booking this video belongs to — `newchadhavaBookings.orderID`. */
  orderId: string;
  /** "chadhava", "puja", … */
  service: string;
  /** The offering's own name — for a Tri-Jyotirling order, the temple's.
   *  Empty when ops never recorded one. */
  serviceName?: string;
  name: string;
  /** "coming_soon" = ops has filed this booking's row but not the link yet. */
  status: "ready" | "coming_soon";
  /** Absolute and ready to parse. Empty unless `status` is "ready". */
  videoUrl: string;
  link: string;
  createdAt?: string;
  /** From the matching booking — absent when no booking of this devotee's
   *  carries the order id, so treat every one of these as optional. */
  pujaTitle?: string;
  temple?: string;
  pujaDate?: string;
}

export const SERVICE_VIDEO_KEYS = {
  all: ["serviceVideos"] as const,
  byPhone: (phone: string, service: string) =>
    [...SERVICE_VIDEO_KEYS.all, "byPhone", phone, service] as const,
};

/** Order ids are compared case- and whitespace-insensitively; they are typed by
 *  hand into the ops sheet, so an exact === match loses real videos. */
export const orderKey = (orderId: unknown): string =>
  String(orderId ?? "").trim().toUpperCase();

const fetchServiceVideos = async (phone: string, service: string): Promise<ServiceVideo[]> => {
  const res = await api.get(`/service-videos/by-phone/${encodeURIComponent(phone)}`, {
    params: { service },
  });
  return Array.isArray(res.data?.videos) ? res.data.videos : [];
};

/**
 * Every video delivered to one devotee for one service.
 *
 * Returns an empty list — never an error state — when the devotee has no
 * videos yet, which is the common case: the profile must render the bookings
 * exactly as before whether or not this call succeeds.
 */
export const useServiceVideosQuery = (phone: string | undefined, service = "chadhava") => {
  const query = useQuery({
    queryKey: SERVICE_VIDEO_KEYS.byPhone(phone ?? "", service),
    queryFn: () => fetchServiceVideos(phone as string, service),
    enabled: Boolean(phone),
    staleTime: 10 * 60 * 1000,
  });

  /** Ready-made lookup for the booking list: orderId → video. */
  const byOrderId = useMemo(() => {
    const map = new Map<string, ServiceVideo>();
    for (const video of query.data ?? []) {
      const key = orderKey(video.orderId);
      if (!key) continue;
      const held = map.get(key);
      /* Newest first from the API, so the first row for an order wins — except
         that a playable video always beats a "coming soon" placeholder, however
         the two are ordered. Ops re-filing a row leaves both behind. */
      if (!held || (held.status !== "ready" && video.status === "ready")) map.set(key, video);
    }
    return map;
  }, [query.data]);

  return { ...query, videos: query.data ?? [], byOrderId };
};
