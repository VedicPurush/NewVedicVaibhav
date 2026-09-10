"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Carousel } from "antd";
import useMediaQuery from '@mui/material/useMediaQuery';
import type { CarouselRef } from "antd/es/carousel";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";

const banners = [
  {
    img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner-images/web%20banner-optimized.webp",
    link: "/shop/rakhi",
    expiryDate: "2025-08-10",
  },
];

const StripOfPujaBanner: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();
  const isSmallScreen = useMediaQuery("(max-width:600px)");
  const carouselRef = useRef<CarouselRef | null>(null);

  // Get today's date in 'YYYY-MM-DD' format
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);


  const nextSlide = () => {
    carouselRef.current?.next();
  };
  const prevSlide = () => {
    carouselRef.current?.prev();
  };

  // Filter banners that are still valid
  const validBanners = banners.filter(
    (banner) => banner.expiryDate > todayStr // Only show if expiryDate is after today
  );

  // Optionally, you can handle the case when no banners are valid
  if (validBanners.length === 0) return null;

  return (
    <div className="relative hidden lg:block px-[6%] w-full my-4">
      <Carousel
        ref={carouselRef}
        autoplay
        dots={false}
        beforeChange={(_, next) => setCurrentSlide(next)}
        effect="fade"
      >
        {validBanners.map((banner, index) => (
          <div
            key={index}
            className="relative w-full cursor-pointer"
            onClick={() => router.push(banner.link)}
          >
            <img loading="lazy" 
              src={banner.img}
              alt={`Puja Banner ${index + 1}`}
              className="w-full object-cover rounded-3xl"
              style={{ maxHeight: isSmallScreen ? 180 : 280, width: "100%" }}
             />
          </div>
        ))}
      </Carousel>


      <button
        onClick={prevSlide}
        className="absolute top-1/2 left-[7%] hidden md:block transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <LeftOutlined />
      </button>
      <button
        onClick={nextSlide}
        className="absolute top-1/2 right-[7%] hidden md:block transform -translate-y-1/2 text-white bg-black bg-opacity-20 hover:bg-opacity-50 p-2 rounded-full transition z-10"
      >
        <RightOutlined />
      </button>
      {/* Dots */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {validBanners.map((_, index) => (
          <div
            key={index}
            className={`h-1 w-8 transition-all ${
              index === currentSlide ? "bg-white" : "bg-gray-400 opacity-50"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default StripOfPujaBanner;