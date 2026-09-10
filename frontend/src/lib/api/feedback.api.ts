import { api } from "@/lib/api";

export interface Feedback {
  name: string;
  location?: string;
  feedback: string;
  rating: number;
}

export const fetchAllFeedback = async (): Promise<Feedback[]> => {
  try {
    const res = await api.get("/feedback");
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data
        .map((item: any) => ({
          name: String(item.name || item.userName || "Devotee").trim(),
          location: String(item.location || item.city || item.state || "").trim() || undefined,
          feedback: String(item.review || item.feedback || "").trim(),
          rating: Math.max(0, Math.min(5, Number(item.rating) || 0)),
        }))
        .filter((f: Feedback) => f.name && f.feedback);
    }
    return [];
  } catch (err) {
    console.error("Error fetching feedback:", err);
    return [];
  }
};
