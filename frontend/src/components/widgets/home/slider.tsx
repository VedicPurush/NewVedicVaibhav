"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAllBanners } from "@/hooks/useAllBanner";
import { filterActiveBanners } from "@/lib/banner";
import { resolveHomeBanners, type HomeBanner } from "@/lib/homeBanners";
import BannerSlide, { useBannerNavigation } from "./bannerSlide";

/**
 * Desktop hero, in two stages.
 *
 * Stage 1 (server HTML, and the first paint): the first banner, rendered as a
 * plain slide. No carousel library, no JavaScript needed to show it.
 * Stage 2 (desktop only, after hydration): the antd Carousel chunk loads and
 * takes over, adding rotation, arrows and dots.
 *
 * It used to be one stage — the Carousel, statically imported. Two costs came
 * out of that. HomePage gates this whole section to `md:block`, but `hidden` only
 * hides, so every *phone* still downloaded, parsed and mounted 44KB of
 * react-slick for a slider it never displays. And on desktop the LCP image could
 * not paint until that chunk had arrived and mounted, which put a JavaScript
 * download on the critical path to an image the server already knew the URL of.
 *
 * Stage 1 renders the identical <BannerSlide> the carousel will render, so the
 * handover is invisible: same markup, same image (already decoded), same box.
 */
const HomepageSlider: React.FC<{
  /** Server-fetched banners, so the hero renders on the first pass. */
  initialBanners?: unknown[] | null;
}> = ({ initialBanners }) => {
  const { data: bannersFromApi, isLoading, isError } = useAllBanners(initialBanners);
  const onNavigate = useBannerNavigation();

  const visibleBanners = useMemo(
    () =>
      filterActiveBanners(
        resolveHomeBanners(bannersFromApi as HomeBanner[] | undefined, isLoading, isError),
      ),
    [bannersFromApi, isLoading, isError],
  );

  /**
   * Whether to pull in the carousel.
   *
   * Starts false on the server and on the first client render, so stage 1 is
   * what hydrates — matching the server HTML exactly, with no mismatch. The
   * media query is read in an effect (never during render) because
   * `window.matchMedia` does not exist on the server, and because a viewport
   * read during render is a hydration hazard.
   *
   * There is nothing to rotate with a single banner, so one slide stays stage 1
   * permanently and never fetches the chunk at all.
   */
  const [Carousel, setCarousel] = useState<React.ComponentType<{
    banners: HomeBanner[];
  }> | null>(null);

  useEffect(() => {
    if (Carousel || visibleBanners.length <= 1) return;
    if (!window.matchMedia("(min-width: 768px)").matches) return;

    let cancelled = false;
    import("./SliderCarousel")
      .then((mod) => {
        if (!cancelled) setCarousel(() => mod.default);
      })
      .catch(() => {
        // Chunk failed to load — stage 1 stays up, so the hero is still a
        // working banner with a working link, just not a rotating one.
      });
    return () => {
      cancelled = true;
    };
  }, [Carousel, visibleBanners.length]);

  if (isLoading) {
    // Same footprint as a rendered banner so the hero does not jump when it
    // resolves. Previously this was a 12rem "Loading..." box.
    return (
      <div className="w-full aspect-[1200/420] rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 animate-pulse" />
    );
  }

  if (visibleBanners.length === 0) return null;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden">
      {Carousel ? (
        <Carousel banners={visibleBanners} />
      ) : (
        <BannerSlide banner={visibleBanners[0]} index={0} onNavigate={onNavigate} />
      )}
    </div>
  );
};

export default HomepageSlider;
