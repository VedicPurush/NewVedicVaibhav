"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { isExternalBannerLink, normalizeBannerLink } from "@/lib/banner";
import type { HomeBanner } from "@/lib/homeBanners";

/**
 * One desktop hero slide, shared by the statically rendered first slide in
 * `slider.tsx` and the upgraded carousel in `SliderCarousel.tsx`.
 *
 * It lives in its own module so the two can render byte-identical markup. They
 * have to: the static slide is what the server emits and what the browser paints
 * as the LCP element, and the carousel then takes that same slide over. Any
 * difference between the two would show up as a flash or a layout shift at the
 * moment the carousel mounts.
 */

/** Transparent 1x1 GIF — a source the browser can "download" for free. */
export const BLANK_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Shared click policy: the router handles plain same-origin clicks, the browser
 *  keeps everything else (new tab, modified click, external host). */
export const useBannerNavigation = () => {
  const router = useRouter();

  return (event: React.MouseEvent, link: string | undefined) => {
    const normalizedLink = normalizeBannerLink(link ?? "");
    if (!normalizedLink) return;
    if (isExternalBannerLink(normalizedLink)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;

    event.preventDefault();
    router.push(normalizedLink);
  };
};

interface BannerSlideProps {
  banner: HomeBanner;
  /** Index 0 is the LCP candidate and is loaded eagerly at high priority. */
  index: number;
  onNavigate: (event: React.MouseEvent, link: string | undefined) => void;
}

const BannerSlide: React.FC<BannerSlideProps> = ({ banner, index, onNavigate }) => {
  const href = normalizeBannerLink(banner.bannerLink) || "#";
  const external = isExternalBannerLink(href);
  // Only the first slide is the LCP candidate. It must not be lazy —
  // that actively delays Largest Contentful Paint — while every other
  // slide should stay out of the critical path.
  const isLcpCandidate = index === 0;

  return (
    <div className="relative w-full">
      <a
        href={href}
        onClick={(event) => onNavigate(event, banner.bannerLink)}
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
};

export default BannerSlide;
