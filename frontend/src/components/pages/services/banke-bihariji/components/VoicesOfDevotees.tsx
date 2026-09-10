"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type BBSevaReview } from "../api/bbSeva.api";
import { useBBSevaReviewsQuery } from "@/hooks/queries/useBBSevaQueries";

/* ── card palette cycles ───────────────────────────────────────── */
const PALETTES = [
  { bgColor: "#FFF7E6", accentColor: "#f59e0b", textColor: "#92400e" },
  { bgColor: "#F0FDF4", accentColor: "#22c55e", textColor: "#14532d" },
  { bgColor: "#EFF6FF", accentColor: "#3b82f6", textColor: "#1e3a5f" },
  { bgColor: "#FDF4FF", accentColor: "#a855f7", textColor: "#581c87" },
  { bgColor: "#FFF1F2", accentColor: "#f43f5e", textColor: "#881337" },
  { bgColor: "#F0FDFA", accentColor: "#14b8a6", textColor: "#134e4a" },
];

/* ── star rating ───────────────────────────────────────────────── */
const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5 mb-3">
    {[1, 2, 3, 4, 5].map((s) => (
      <svg key={s} width="15" height="15" viewBox="0 0 24 24"
        fill={s <= rating ? "#f59e0b" : "#d1d5db"}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

/* ── skeleton card placeholder ─────────────────────────────────── */
const SkeletonCard = () => (
  <div className="snap-center min-w-[85vw] md:min-w-0 rounded-3xl p-6 md:p-8 shadow-md bg-white/60 animate-pulse flex flex-col gap-3">
    <div className="flex gap-0.5 mb-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} className="w-4 h-4 rounded-full bg-amber-200" />
      ))}
    </div>
    <div className="h-3 bg-gray-200 rounded w-full" />
    <div className="h-3 bg-gray-200 rounded w-5/6" />
    <div className="h-3 bg-gray-200 rounded w-4/6" />
    <div className="flex items-center gap-3 mt-auto pt-4">
      <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0" />
      <div className="flex-1 space-y-1">
        <div className="h-3 bg-gray-300 rounded w-28" />
        <div className="h-2.5 bg-gray-200 rounded w-20" />
      </div>
    </div>
  </div>
);


const VoicesOfDevotees = () => {
  const [page, setPage] = useState(1);
  const [allReviews, setAllReviews] = useState<BBSevaReview[]>([]);

  const { data, isLoading: loading, isFetching: loadingMore } = useBBSevaReviewsQuery(page, 10);

  const totalReviews = data?.total ?? 0;
  const hasMore = page * 10 < totalReviews;

  useEffect(() => {
    if (!data?.reviews) return;
    setAllReviews((prev) => (page === 1 ? data.reviews : [...prev, ...data.reviews]));
  }, [data, page]);

  const reviews = allReviews;

  const observerRef = useRef<IntersectionObserver | null>(null);

  const lastReviewRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore, hasMore]
  );

  return (
    <section className="py-10 md:py-18 bg-[#f2a12e] relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] aspect-square rounded-full bg-white/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-10%] w-[35%] aspect-square rounded-full bg-white/10 blur-[80px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-14"
        >
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-[#114296] font-heading tracking-tight mb-2">
            Voices of Devotees
          </h2>
          {!loading && totalReviews > 0 && (
            <p className="text-[#5a3e00] text-sm md:text-base font-medium opacity-80">
              {totalReviews}+ verified reviews from real devotees
            </p>
          )}
        </motion.div>

        {/* Loading skeletons (initial load) */}
        {loading && (
          <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto pb-8 md:pb-0 scrollbar-hide">
            <style>{`
              .scrollbar-hide::-webkit-scrollbar { display: none; }
              .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* No reviews state */}
        {!loading && reviews.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            <p className="text-[#5a3e00] text-base font-medium opacity-80">
              Be the first to share your experience with Bihari Ji 🙏
            </p>
          </motion.div>
        )}

        {/* Reviews grid / carousel */}
        {!loading && reviews.length > 0 && (
          <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto pb-8 md:pb-0 scrollbar-hide">
            <style>{`
              .scrollbar-hide::-webkit-scrollbar { display: none; }
              .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <AnimatePresence>
              {reviews.map((t, i) => {
                const palette = PALETTES[i % PALETTES.length];
                // Attach intersection observer to the 8th item (index 7), or the 3rd to last item if there are enough items
                const isTriggerElement = reviews.length >= 8 
                                            ? i === reviews.length - 3 
                                            : i === reviews.length - 1;

                return (
                  <motion.div
                    ref={isTriggerElement ? lastReviewRef : null}
                    key={i} // Cannot use name reliably since same person might have multiple duplicate reviews
                    initial={{ opacity: 0, scale: 0.93, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45 }}
                    whileHover={{ y: -6 }}
                    className="snap-center min-w-[85vw] md:min-w-0 rounded-3xl p-6 md:p-8 shadow-[0_12px_30px_rgba(0,0,0,0.1)] relative flex flex-col justify-between group"
                    style={{ backgroundColor: palette.bgColor }}
                  >
                    {/* Decorative quote mark */}
                    <div
                      className="absolute top-4 right-5 text-5xl md:text-7xl font-serif opacity-20 select-none group-hover:opacity-35 transition-opacity leading-none"
                      style={{ color: palette.accentColor }}
                    >
                      ❝
                    </div>

                    {/* Stars */}
                    <div className="relative z-10">
                      <StarRating rating={t.rating} />
                      <p
                        className="text-sm md:text-base font-medium leading-relaxed mb-5 md:mb-7"
                        style={{ color: palette.textColor }}
                      >
                        "{t.review}"
                      </p>

                      {/* Package tag */}
                      {t.packageName && (
                        <span
                          className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-4 opacity-80"
                          style={{
                            backgroundColor: palette.accentColor + "22",
                            color: palette.accentColor,
                            border: `1px solid ${palette.accentColor}44`,
                          }}
                        >
                          {t.packageName}
                        </span>
                      )}
                    </div>

                    {/* Devotee info */}
                    <div className="flex items-center gap-3 mt-auto relative z-10">
                      <div
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base text-white flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: palette.accentColor }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm md:text-base" style={{ color: palette.textColor }}>
                          {t.name}
                        </h4>
                        {t.location && (
                          <p
                            className="text-xs font-medium opacity-70"
                            style={{ color: palette.textColor }}
                          >
                            {t.location}
                          </p>
                        )}
                      </div>
                      {/* Verified badge */}
                      <div className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        Verified
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Skeleton shown at the end while fetching more */}
            {loadingMore && (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default VoicesOfDevotees;
