"use client";

import React, { useRef, useState } from "react";
import { Carousel } from "antd";
import type { CarouselRef } from "antd/es/carousel";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { HomeBanner } from "@/lib/homeBanners";
import BannerSlide, { useBannerNavigation } from "./bannerSlide";

/**
 * The rotating desktop hero — antd's Carousel, its arrows, and the two
 * slick-carousel stylesheets.
 *
 * Split into its own module so that whole dependency (react-slick plus the antd
 * Carousel wrapper: a 44KB chunk) is a separate download, requested only by
 * `slider.tsx` and only on a desktop-width viewport. It used to be a static
 * import, which meant every phone fetched, parsed and *mounted* it — the section
 * around it is `hidden md:block`, and `hidden` only hides, so the carousel and
 * its autoplay timer were running behind a display:none box on every mobile
 * visit. That parse is main-thread work during hydration, which is what Total
 * Blocking Time measures.
 *
 * Desktop pays less for it too. The first slide no longer waits on this chunk to
 * paint (slider.tsx renders it directly), so Largest Contentful Paint is decided
 * by the image alone and the carousel arrives whenever it arrives.
 */
const SliderCarousel: React.FC<{ banners: HomeBanner[] }> = ({ banners }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<CarouselRef | null>(null);
  const onNavigate = useBannerNavigation();

  return (
    <>
      <Carousel
        ref={carouselRef}
        autoplay
        dots={false}
        beforeChange={(_, next) => setCurrentSlide(next)}
        effect="fade"
      >
        {banners.map((banner, index) => (
          <BannerSlide
            key={banner._id || index}
            banner={banner}
            index={index}
            onNavigate={onNavigate}
          />
        ))}
      </Carousel>

      <button
        type="button"
        onClick={() => carouselRef.current?.prev()}
        aria-label="Previous banner"
        className="absolute hidden md:block top-1/2 left-4 transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <LeftOutlined />
      </button>
      <button
        type="button"
        onClick={() => carouselRef.current?.next()}
        aria-label="Next banner"
        className="absolute top-1/2 hidden md:block right-4 transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <RightOutlined />
      </button>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {banners.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all ${
              index === currentSlide ? "bg-white" : "bg-gray-400 opacity-50"
            }`}
          />
        ))}
      </div>
    </>
  );
};

export default SliderCarousel;
