"use client";

import { memo, useMemo, useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Carousel } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import "./ReviewPuja.css";
import SectionHeader from "@/components/shared/SectionHeader";
import Star from "@mui/icons-material/Star";
import StarBorder from "@mui/icons-material/StarBorder";
import VerifiedIcon from "@mui/icons-material/Verified";
import { type ParsedVideo } from "@/lib/videoLinkParser";
import { useFeedbackQuery } from "@/hooks/queries/useFeedbackQueries";
import { useVideoProofsQuery } from "@/hooks/queries/useVideoProofsQuery";
import { useMediaQueryMatch } from "@/hooks/useMediaQueryMatch";

// ─── Types ────────────────────────────────────────────────────────────────────

type Review = {
  name: string;
  location?: string;
  feedback: string;
  rating: number;
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const clampRating = (r: number) => Math.max(0, Math.min(5, Number(r) || 0));
const fmtRating = (r: number) => clampRating(r).toFixed(1);

const getInitials = (name?: string) => {
  const n = String(name || "").trim();
  if (!n) return "V";
  return n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "V";
};

const shuffleArray = (arr: any[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ─── Review sub-components ───────────────────────────────────────────────────

const VerifiedBadge = memo(({ compact = false }: { compact?: boolean }) => (
  <div className={`verified-badge ${compact ? "verified-badge--compact" : ""}`}>
    <VerifiedIcon className="verified-badge__icon" />
    <span>Verified Devotee</span>
  </div>
));

const StarRating = memo(({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) => {
  const r = Math.round(clampRating(rating));
  return (
    <div className={`review-stars ${size === "sm" ? "review-stars--sm" : ""}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="review-star">
          {i < r
            ? <Star className="review-star--filled" />
            : <StarBorder className="review-star--empty" />}
        </span>
      ))}
    </div>
  );
});

const MobileReviewCard = memo(({
  item, isExpanded, isActive, onToggle,
}: {
  item: Review;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
}) => {
  // Whether "Read more" is needed used to be guessed from the review's
  // character count, but the card is 229px wide on a 360px phone and 279px on a
  // 430px one — the same review clamps on one and fits on the other, so any
  // single threshold either hides text with no way to open it or offers the
  // button on a review that is fully visible. Measuring the clamped box against
  // its own content is exact at every width.
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [isClipped, setIsClipped] = useState(false);

  useEffect(() => {
    const el = feedbackRef.current;
    // While expanded the clamp is off and the box always fits, which would read
    // as "not clipped" and pull "Show less" out from under the reader. Only
    // measure while collapsed and keep the last answer.
    if (!el || isExpanded) return;

    const measure = () => setIsClipped(el.scrollHeight > el.clientHeight + 1);
    measure();

    // Width changes (rotation, slick resizing the slide) reflow the text.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The clamped box is a fixed height, so a late webfont swap reflows the
    // text without ever resizing the element ResizeObserver is watching.
    document.fonts?.ready.then(measure).catch(() => { });
    return () => ro.disconnect();
  }, [item.feedback, isExpanded]);

  return (
    <div className="review-card glass-card review-card--mobile">
      {/* The location sits with the rating rather than with the badge, as it
          does on desktop: the two never fit on one line in a card this narrow,
          so it wrapped to a line of its own and cost the card ~30px of height.
          The rating row spans the full card width, which leaves room for both. */}
      <div className="review-top">
        <div className="review-avatar">{getInitials(item.name)}</div>
        <div className="review-top__meta">
          <div className="review-subrow">
            <VerifiedBadge compact />
          </div>
          <div className="review-name">{item.name}</div>
        </div>
        <div className="review-right">
          <StarRating rating={item.rating} size="sm" />
          <div className="review-score">{fmtRating(item.rating)}</div>
          {item.location && <span className="review-location-inline">{item.location}</span>}
        </div>
      </div>
      {/* The button is positioned over the end of the clamped text rather than
          given a row of its own, so it needs a box to anchor to that is exactly
          as tall as the text. A review short enough not to need one now renders
          nothing here at all — no reserved strip left sitting empty under it. */}
      <div className="review-feedback-wrap">
        <div
          ref={feedbackRef}
          className={`review-feedback ${isExpanded ? "review-feedback--expanded" : "review-feedback--clamp"}`}
        >
          "{item.feedback}"
        </div>
        {isClipped && (
          <button
            type="button"
            className="review-more-btn"
            // Off-screen slides are aria-hidden by slick; their controls must
            // leave the tab order to match.
            tabIndex={isActive ? undefined : -1}
            onClick={onToggle}
          >
            {isExpanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
});

MobileReviewCard.displayName = "MobileReviewCard";

const OptimizedCarousel = memo(({ reviews }: { reviews: Review[] }) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // slick marks every off-screen slide aria-hidden="true" but leaves its
  // contents in the tab order, so the "Read more" buttons were focusable inside
  // hidden containers — a keyboard user tabbed into reviews they could not see.
  // Tracking the active slide lets only its button stay focusable.
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <Carousel
      autoplay
      dots
      className="review-carousel"
      autoplaySpeed={4500}
      beforeChange={(_from, to) => setActiveIdx(to)}
      // centerMode leaves a strip of the previous and next slide visible on
      // either side of the active one, so the strip reads as a carousel without
      // needing arrows. centerPadding is that strip's width — 11% a side leaves
      // the active card 78% of the container: enough of the neighbours shows to
      // read as a card rather than a sliver, while the active one still fits
      // the name, badge and rating. antd passes both straight through to
      // react-slick.
      centerMode
      centerPadding="11%"
      slidesToShow={1}
    >
      {reviews.map((item, index) => {
        const isExpanded = expandedIdx === index;
        return (
          <div key={index} className="carousel-item">
            <MobileReviewCard
              item={item}
              isExpanded={isExpanded}
              isActive={index === activeIdx}
              onToggle={() => setExpandedIdx(isExpanded ? null : index)}
            />
          </div>
        );
      })}
    </Carousel>
  );
});

// ─── Video thumbnail card (square, opens modal on click) ─────────────────────

const VideoThumb = memo(({
  v, size, onSelect,
}: {
  v: ParsedVideo;
  size: number;
  onSelect: (v: ParsedVideo) => void;
}) => {
  const [imgError, setImgError] = useState(false);
  const isYT = v.type === "youtube";

  return (
    <motion.div
      whileHover={{ scale: 1.04, boxShadow: "0 12px 32px rgba(0,0,0,0.22)" }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18 }}
      onClick={() => onSelect(v)}
      className="flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer shadow-md"
      style={{ width: size, height: size }}
    >
      {/* Thumbnail served through Next's image optimizer rather than hotlinked.
          Fetching drive.google.com / img.youtube.com directly made the browser
          set Google's third-party NID cookie on every visitor and raised a
          third-party-cookie issue in DevTools. Proxying it means the request goes
          to our own origin — no third-party cookie — and comes back as AVIF. */}
      {v.thumbUrl && !imgError ? (
        <Image
          loading="lazy"
          src={v.thumbUrl}
          alt={v.title}
          fill
          sizes={`${size}px`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-700 flex items-center justify-center">
          <span className="text-4xl opacity-40">🎬</span>
        </div>
      )}

      {/* dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

      {/* source badge */}
      <div className="absolute top-2 left-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isYT ? "bg-red-600 text-white" : "bg-blue-600 text-white"
          }`}>
          {isYT ? "YT" : "Drive"}
        </span>
      </div>

      {/* play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/50 flex items-center justify-center shadow-xl transition-transform">
          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* title */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
        <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{v.title}</p>
      </div>
    </motion.div>
  );
});

// ─── Video modal ──────────────────────────────────────────────────────────────

const VideoModal = ({ v, onClose }: { v: ParsedVideo; onClose: () => void }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const driveFileId = v.type === "drive"
    ? v.embedUrl.match(/\/file\/d\/([^/]+)\//)?.[1] ?? null
    : null;
  const useMobileDriveFallback = isMobile && v.type === "drive";
  const [thumbError, setThumbError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={v.title}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 16 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "92dvh" }}
      >
        {/* video area — 16:9 */}
        <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}>
          {useMobileDriveFallback ? (
            /* Mobile + Google Drive: open natively to avoid tap-overlay issue */
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {v.thumbUrl && !thumbError ? (
                /* Proxied for the same reason as the grid thumbnails above. */
                <Image src={v.thumbUrl} alt={v.title} fill sizes="100vw"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setThumbError(true)} />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-800" />
              )}
              <div className="absolute inset-0 bg-black/45" />
              <a
                href={driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : v.embedUrl}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 flex items-center gap-2.5 bg-white text-slate-900 px-5 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Video
              </a>
              <p className="absolute bottom-3 text-white/55 text-[10px]">Opens in Google Drive</p>
            </div>
          ) : (
            <iframe
              src={v.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={v.title}
            />
          )}
        </div>

        {/* meta + close */}
        <div className="px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-sm sm:text-base leading-snug line-clamp-2">{v.title}</p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v.type === "drive" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                  }`}>
                  {v.type === "drive" ? "Google Drive" : "YouTube"}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

const VideoThumbSkeleton = ({ size }: { size: number }) => (
  <div
    className="flex-shrink-0 rounded-2xl animate-pulse bg-gradient-to-br from-slate-200 to-slate-300"
    style={{ width: size, height: size }}
  />
);

// ─── Main component ───────────────────────────────────────────────────────────

const ReviewPuja = () => {
  const { data: apiReviews } = useFeedbackQuery();
  const isDesktop = useMediaQueryMatch("(min-width: 768px)");

  // reviews
  const trackRef = useRef<HTMLDivElement>(null);
  const [loopWidth, setLoopWidth] = useState(0);
  const reviewsList = useMemo(() => (apiReviews ? shuffleArray(apiReviews) : []), [apiReviews]);

  // The mobile carousel used to receive every review in the database — the
  // accessibility audit showed slick slide indices in the 500s, i.e. hundreds of
  // review cards mounted (plus slick's clones) to show one at a time. The list is
  // shuffled, so a slice is still a fair sample.
  const mobileCards = useMemo(
    () => (isDesktop ? [] : reviewsList.slice(0, 15)),
    [reviewsList, isDesktop],
  );

  const desktopCards = useMemo(
    () => (isDesktop ? reviewsList.slice(0, 30) : []),
    [reviewsList, isDesktop],
  );
  const desktopCardsLoop = useMemo(() => [...desktopCards, ...desktopCards], [desktopCards]);

  useEffect(() => {
    if (!trackRef.current) return;
    const half = Math.floor(trackRef.current.scrollWidth / 2);
    setLoopWidth(half > 0 ? half : 0);
  }, [desktopCards.length]);

  const duration = useMemo(() => loopWidth ? Math.max(28, loopWidth / 28) : 0, [loopWidth]);

  // videos
  const { data: videos = [], isLoading: videosLoading } = useVideoProofsQuery();
  const [selectedVideo, setSelectedVideo] = useState<ParsedVideo | null>(null);

  // desktop reels drag-to-scroll
  const reelsRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);

  const onReelsMouseDown = useCallback((e: React.MouseEvent) => {
    if (!reelsRef.current) return;
    isDragging.current = true;
    dragStartX.current = e.clientX;
    scrollStartX.current = reelsRef.current.scrollLeft;
  }, []);

  const onReelsMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !reelsRef.current) return;
    const moved = Math.abs(e.clientX - dragStartX.current);
    if (moved > 4) e.preventDefault();
    reelsRef.current.scrollLeft = scrollStartX.current - (e.clientX - dragStartX.current);
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onReelsClick = useCallback((e: React.MouseEvent) => {
    // suppress click if the mouse moved significantly (was a drag, not a tap)
    const moved = Math.abs(e.clientX - dragStartX.current);
    if (moved > 6) e.stopPropagation();
  }, []);

  const handleSelect = useCallback((v: ParsedVideo) => setSelectedVideo(v), []);
  const handleClose = useCallback(() => setSelectedVideo(null), []);

  const SKELETON = 7;

  return (
    <>
      <div className="review-container">

        {/* ── DESKTOP ─────────────────────────────────────────────────────── */}
        {/* antd's <Col xs={0}> hides with CSS but still mounts, so phones were
            rendering the 60-card desktop marquee *and* the mobile carousel.
            This section is never server-rendered (it sits behind LazySection),
            so a real media query is safe here and mounts only one branch. */}
        {isDesktop && (
          <div className="desktop-review-wrapper">

            <SectionHeader className="mt-[10px] mb-2" title="DEVOTEE REVIEWS" />

            <div className="reviews-strip">
              <motion.div
                ref={trackRef}
                className="reviews-strip__track"
                initial={{ x: 0 }}
                animate={loopWidth ? { x: [0, -loopWidth] } : { x: 0 }}
                transition={loopWidth
                  ? { x: { repeat: Infinity, repeatType: "loop", duration, ease: "linear" } }
                  : undefined}
                whileHover={{ cursor: "grab" }}
                whileTap={{ cursor: "grabbing" }}
              >
                {desktopCardsLoop.map((item, idx) => (
                  <motion.div
                    key={`${item.name}-${idx}`}
                    className="review-card glass-card review-card--desktop"
                    whileHover={{ scale: 1.03, boxShadow: "0 10px 30px rgba(255,143,42,0.18)" }}
                  >
                    <div className="review-top">
                      <div className="review-avatar">{getInitials(item.name)}</div>
                      <div className="review-top__meta">
                        <div className="review-subrow">
                          <VerifiedBadge />
                          {item.location && <span className="review-location-inline">{item.location}</span>}
                        </div>
                        <div className="review-name">{item.name}</div>
                      </div>
                      <div className="review-right">
                        <StarRating rating={item.rating} />
                        <div className="review-score">{fmtRating(item.rating)}</div>
                      </div>
                    </div>
                    <div className="review-feedback review-feedback--clamp">"{item.feedback}"</div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <SectionHeader className="mt-[10px] mb-2" title="OUR VIDEO PROOF" />

            {/* desktop: drag-scrollable strip of square cards */}
            <div
              className="reels-row"
              ref={reelsRef}
              onMouseDown={onReelsMouseDown}
              onMouseMove={onReelsMouseMove}
              onMouseUp={stopDrag}
              onMouseLeave={stopDrag}
              onClickCapture={onReelsClick}
            >
              <div className="reels-row__track">
                {videosLoading
                  ? Array.from({ length: SKELETON }).map((_, i) => (
                    <VideoThumbSkeleton key={i} size={168} />
                  ))
                  : videos.map((v, idx) => (
                    <VideoThumb
                      key={`${v.embedUrl}-${idx}`}
                      v={v}
                      size={168}
                      onSelect={handleSelect}
                    />
                  ))}
              </div>
            </div>

          </div>
        )}

        {/* ── MOBILE ──────────────────────────────────────────────────────── */}
        {!isDesktop && (
          <div className="mobile-review-wrapper">

            <SectionHeader className="mt-[10px] mb-2" title="DEVOTEE REVIEWS" />
            <OptimizedCarousel reviews={mobileCards} />

            <SectionHeader className="mt-[10px] mb-2" title="OUR VIDEO PROOF" />

            {/* mobile: horizontal scrollable strip of square cards */}
            <div className="w-full overflow-x-auto hide-scrollbar py-3">
              <div className="flex gap-3 px-1">
                {videosLoading
                  ? Array.from({ length: SKELETON }).map((_, i) => (
                    <VideoThumbSkeleton key={i} size={130} />
                  ))
                  : videos.map((v, idx) => (
                    <VideoThumb
                      key={`${v.embedUrl}-${idx}`}
                      v={v}
                      size={130}
                      onSelect={handleSelect}
                    />
                  ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ── Video modal (portal-like, above everything) ──────────────────── */}
      <AnimatePresence>
        {selectedVideo && <VideoModal v={selectedVideo} onClose={handleClose} />}
      </AnimatePresence>
    </>
  );
};

export default ReviewPuja;
