import { api } from "@/lib/api";

/**
 * NOTE:
 * - Uses the shared axios instance (single backend origin)
 * - Normalizes backend response shapes safely
 */

export const fetchAllPoojas = async () => {
  const res = await api.get("/fetch-all-pooja");
  return res.data?.poojas || res.data?.data || [];
};

export const fetchAllExclusivePoojas = async () => {
  const res = await api.get("/fetch-all-poojas-exclusive");
  return res.data?.poojas || res.data?.data || [];
};

export const fetchActivePoojaById = async (id: string) => {
  const res = await api.get(`/fetch-active-pooja-by-id/${id}`);
  return res.data?.pooja || res.data?.data || res.data;
};

/** All poojas from the new `newpoojas` collection. */
export const fetchAllNewPoojas = async () => {
  const res = await api.get("/fetch-all-new-poojas");
  return res.data?.poojas || res.data?.data || [];
};

/** Legacy + new poojas merged into one list, each tagged with `source`. */
export const fetchAllPoojasCombined = async () => {
  const res = await api.get("/fetch-all-poojas-combined");
  return res.data?.poojas || res.data?.data || [];
};

/**
 * Look a pooja up by id in either collection.
 * Returns `{ pooja, source }` — `source` tells the caller which shape it is.
 */
export const fetchAnyPoojaById = async (id: string) => {
  const res = await api.get(`/fetch-any-pooja-by-id/${id}`);
  return { pooja: res.data?.pooja ?? null, source: res.data?.source ?? "legacy" };
};

export const fetchMandirById = async (mandirId: string) => {
  const res = await api.get(`/fetch-mandir-by-id/${mandirId}`);
  return res.data?.mandir || res.data?.data || res.data;
};

export const fetchPersonalizedPoojasByMandir = async (mandirId: string) => {
  const res = await api.get(`/fetch-app-personalized-poojas-by-mandir/${mandirId}`);
  return res.data?.poojas || res.data?.data || [];
};

export const fetchAllPersonalizedPoojas = async () => {
  const res = await api.get("/fetch-all-app-personalized-poojas");
  return res.data?.poojas || res.data?.data || [];
};
