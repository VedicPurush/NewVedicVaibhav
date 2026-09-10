import { api } from "@/lib/api";

export const fetchJyotirlingas = async () => {
  const res = await api.get("/jyotirlinga");
  return res.data || [];
};
