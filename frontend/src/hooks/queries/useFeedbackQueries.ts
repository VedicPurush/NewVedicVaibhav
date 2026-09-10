import { useQuery } from "@tanstack/react-query";
import { FEEDBACK_KEYS } from "@/lib/query-keys/feedback.keys";
import { fetchAllFeedback } from "@/lib/api/feedback.api";

export const useFeedbackQuery = () => {
  return useQuery({
    queryKey: FEEDBACK_KEYS.list(),
    queryFn: fetchAllFeedback,
    staleTime: 30 * 60 * 1000, // 30 min
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};
