"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Carousel } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { useAllBanners } from "@/hooks/useAllBanner";
import {
  filterActiveBanners,
  isExternalBannerLink,
  normalizeBannerLink,
} from "@/lib/banner";
import { resolveHomeBanners, type HomeBanner } from "@/lib/homeBanners";

/** Transparent 1x1 GIF — a source the browser can "download" for free. */
const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

interface HomepageSliderProps {
  /** Server-fetched banners, so the hero renders on the first pass. */
  initialBanners?: unknown[] | null;
}

const HomepageSlider: React.FC<HomepageSliderProps> = ({ initialBanners }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const carouselRef = useRef<CarouselRef | null>(null);

  const { data: bannersFromApi, isLoading, isError } = useAllBanners(initialBanners);

  const visibleBanners = useMemo(
    () =>
      filterActiveBanners(
        resolveHomeBanners(bannersFromApi as HomeBanner[] | undefined, isLoading, isError),
      ),
    [bannersFromApi, isLoading, isError],
  );

  const nextSlide = () => carouselRef.current?.next();
  const prevSlide = () => carouselRef.current?.prev();

  useEffect(() => {
    if (currentSlide >= visibleBanners.length) setCurrentSlide(0);
  }, [currentSlide, visibleBanners.length]);

  const handleNavigation = (event: React.MouseEvent, link: string) => {
    const normalizedLink = normalizeBannerLink(link);
    if (!normalizedLink) return;

    // External links and modified clicks (new tab, etc.) keep the browser's
    // default behaviour; only same-origin plain clicks are handled by the router.
    if (isExternalBannerLink(normalizedLink)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    router.push(normalizedLink);
  };

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
      <Carousel
        ref={carouselRef}
        autoplay
        dots={false}
        beforeChange={(_, next) => setCurrentSlide(next)}
        effect="fade"
      >
        {visibleBanners.map((banner, index) => {
          const href = normalizeBannerLink(banner.bannerLink) || "#";
          const external = isExternalBannerLink(href);
          // Only the first slide is the LCP candidate. It must not be lazy —
          // that actively delays Largest Contentful Paint — while every other
          // slide should stay out of the critical path.
          const isLcpCandidate = index === 0;

          return (
            <div key={banner._id || index} className="relative w-full">
              <a
                href={href}
                onClick={(event) => handleNavigation(event, banner.bannerLink)}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-2xl"
              >
                {/* This carousel is gated to md+ by HomePage, but `hidden`
                    only hides — the element still mounts and still fetches its
                    image. Phones were therefore downloading a full-size banner
                    for a slider they never see.

                    The <picture> resolves in the browser's preload scanner
                    (before hydration), so pointing its small-screen source at an
                    inline 1x1 pixel costs a phone nothing, while desktop still
                    gets the real banner from the very first paint. */}
                <picture>
                  <source media="(max-width: 767px)" srcSet={BLANK_PIXEL} />
                  <img
                    src={banner.bannerWebImage}
                    alt={banner.bannerName}
                    loading={isLcpCandidate ? "eager" : "lazy"}
                    fetchPriority={isLcpCandidate ? "high" : "low"}
                    decoding={isLcpCandidate ? "sync" : "async"}
                    className="w-full object-cover rounded-2xl"
                  />
                </picture>

                {banner.buttonLabel && (
                  /* A span, not a button — it navigates to the same place as the
                     slide it sits inside, and a button nested in a link is
                     invalid and confuses keyboard/screen-reader users.
                     Desktop coordinates: this carousel is gated to md+ by
                     HomePage; the mobile strip is BannerShriBankeBihariji. */
                  <span
                    className="absolute bg-white text-base text-orange-600 rounded-full font-semibold py-2 px-10 shadow-md transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-xl"
                    style={{
                      top: `${banner.buttonPosition?.top ?? "0"}%`,
                      left: `${banner.buttonPosition?.left ?? "0"}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {banner.buttonLabel}
                  </span>
                )}
              </a>
            </div>
          );
        })}
      </Carousel>

      <button
        type="button"
        onClick={prevSlide}
        aria-label="Previous banner"
        className="absolute hidden md:block top-1/2 left-4 transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <LeftOutlined />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        aria-label="Next banner"
        className="absolute top-1/2 hidden md:block right-4 transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <RightOutlined />
      </button>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {visibleBanners.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all ${
              index === currentSlide ? "bg-white" : "bg-gray-400 opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HomepageSlider;
