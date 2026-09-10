"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAllBanners } from "@/hooks/useAllBanner";
import {
  filterActiveBanners,
  isExternalBannerLink,
  isBannerExpired,
  normalizeBannerLink,
} from "@/lib/banner";
import { resolveHomeBanners, type HomeBanner } from "@/lib/homeBanners";

interface MobileSlide {
  id: string;
  imageUrl: string;
  link: string;
  expiryDate?: string;
}

/**
 * Hard-coded campaign slides shown after the CMS banners.
 *
 * NOTE: these previously read "2025-012-31", which `Date.parse` rejects — and
 * `isBannerExpired` treats an unparseable date as "never expires", so both
 * slides had been running past their intended end date. The dates below are the
 * intended ones.
 */
const STATIC_SLIDES: MobileSlide[] = [
  {
    id: "static_4",
    imageUrl:
      "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner/banner-1-optimized.webp",
    link: "/services/puja/shri-banke-bihari-puja",
    expiryDate: "2025-12-31",
  },
  {
    id: "static_6",
    imageUrl:
      "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner/banner-2-optimized.webp",
    link: "/services/puja/687e7037b74af9a76da1db60/select-package",
    expiryDate: "2025-12-31",
  },
];

const SLIDE_INTERVAL_MS = 3000;
const SWIPE_THRESHOLD_PX = 30;

interface BannerShriBankeBiharijiProps {
  /** Server-fetched banners — this strip is the mobile LCP element. */
  initialBanners?: unknown[] | null;
}

const BannerShriBankeBihariji: React.FC<BannerShriBankeBiharijiProps> = ({ initialBanners }) => {
  const router = useRouter();
  const { data: bannersFromApi, isLoading, isError } = useAllBanners(initialBanners);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchPosition, setTouchPosition] = useState<number | null>(null);

  const allSlides: MobileSlide[] = useMemo(() => {
    const dynamic = filterActiveBanners(
      resolveHomeBanners(bannersFromApi as HomeBanner[] | undefined, isLoading, isError),
    ).map((banner) => ({
      id: banner._id,
      imageUrl: banner.bannerMobileImage || banner.bannerWebImage,
      link: banner.bannerLink,
      expiryDate: banner.dueDate,
    }));

    return [...dynamic, ...STATIC_SLIDES].filter(
      (slide) => !isBannerExpired(slide.expiryDate),
    );
  }, [bannersFromApi, isLoading, isError]);

  const slideCount = allSlides.length;

  // Auto-advance. Suspended while the tab is hidden so a backgrounded phone is
  // not running a timer and repainting a carousel nobody is looking at.
  useEffect(() => {
    if (slideCount <= 1) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval === null) {
        interval = setInterval(
          () => setCurrentIndex((prev) => (prev + 1) % slideCount),
          SLIDE_INTERVAL_MS,
        );
      }
    };

    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibilityChange = () => (document.hidden ? stop() : start());

    start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [slideCount]);

  // Keep the index in range when the slide list shrinks.
  useEffect(() => {
    if (slideCount > 0 && currentIndex >= slideCount) setCurrentIndex(0);
  }, [currentIndex, slideCount]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchPosition(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchPosition === null || slideCount === 0) return;

    const diff = touchPosition - e.changedTouches[0].clientX;

    // 5px was low enough that an ordinary tap registered as a swipe and the
    // banner changed under the user's finger before the click landed.
    if (diff > SWIPE_THRESHOLD_PX) {
      setCurrentIndex((prev) => (prev + 1) % slideCount);
    } else if (diff < -SWIPE_THRESHOLD_PX) {
      setCurrentIndex((prev) => (prev - 1 + slideCount) % slideCount);
    }

    setTouchPosition(null);
  };

  const handleBannerClick = (event: React.MouseEvent, link: string) => {
    const normalizedLink = normalizeBannerLink(link);
    if (!normalizedLink) return;
    if (isExternalBannerLink(normalizedLink)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    router.push(normalizedLink);
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-2 md:hidden">
        {/* Same ratio as a real slide, so resolving does not move the page. */}
        <div className="w-full aspect-[27/10] rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 animate-pulse" />
      </div>
    );
  }

  if (slideCount === 0) return null;

  return (
    <div
      className="relative w-full py-2 overflow-hidden md:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label="Featured offerings"
    >
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {allSlides.map((slide, idx) => {
          const href = normalizeBannerLink(slide.link) || "#";
          const external = isExternalBannerLink(href);
          const isLcpCandidate = idx === 0;

          return (
            <div
              key={slide.id || idx}
              className="flex-shrink-0 w-full px-4"
              role="group"
              aria-roledescription="slide"
              aria-label={`Banner ${idx + 1} of ${slideCount}`}
              aria-hidden={idx !== currentIndex}
            >
              <a
                href={href}
                onClick={(event) => handleBannerClick(event, slide.link)}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                // Off-screen slides must not be tab stops.
                tabIndex={idx === currentIndex ? undefined : -1}
                className="block rounded-2xl overflow-hidden shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                {/* Fixed aspect box. Lighthouse flagged this image as unsized:
                    with `h-auto` the browser reserved zero height until the
                    bitmap arrived, then pushed the whole page down. Banner
                    dimensions are not known ahead of time (CMS-supplied), so the
                    box sets the ratio and `object-contain` guarantees nothing is
                    ever cropped — a differently-shaped banner letterboxes
                    instead of shifting the page. */}
                <div className="relative w-full aspect-[27/10] bg-orange-50">
                  {/* Routed through next/image so the CMS banner is resized to
                      the slot and negotiated down to AVIF/WebP. The originals are
                      105KB and 519KB for a ~380px-wide box, and this slide is the
                      mobile LCP element — the single heaviest thing on the page. */}
                  <Image
                    src={slide.imageUrl}
                    alt={`Banner ${idx + 1}`}
                    fill
                    // This strip is md:hidden — but hidden still fetches. Asking
                    // for a 16px variant above the breakpoint means desktop pays
                    // essentially nothing for a banner it never displays, while
                    // phones get one sized to the viewport.
                    sizes="(min-width: 768px) 16px, 100vw"
                    // The first slide is the only thing above the fold on mobile —
                    // it is the LCP element and must not be lazy-loaded.
                    priority={isLcpCandidate}
                    loading={isLcpCandidate ? undefined : "lazy"}
                    className="object-contain"
                  />
                </div>
              </a>
            </div>
          );
        })}
      </div>

      {slideCount > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {allSlides.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 w-2 rounded-full ${
                index === currentIndex ? "bg-white" : "bg-gray-400 opacity-60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerShriBankeBihariji;
