"use client";

import React from "react";
import { Carousel, Col } from "antd";

const CarouselComponent: React.FC = () => {
  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true,
  };

  const images: string[] = [
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal1.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal2.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal3.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal4.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal5.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal6.png",
    "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pooja-images/corosal7.png",
  ];

  return (
    <Col xl={0} lg={0} md={0} xs={24} sm={24}>
      <div>
        <Carousel {...settings} style={{ marginBottom: "10px" }}>
          {images.map((image, index) => (
            <div key={index}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  paddingBottom: "30px", // add space for dots
                }}
              >
                <img loading="lazy"
                  src={image}
                  alt={`Slide ${index + 1}`}
                  style={{
                    width: "40%",
                    height: "auto",
                    maxWidth: "100%",
                  }}
                 />
              </div>
            </div>
          ))}
        </Carousel>
      </div>
      <style>
        {`
          .ant-carousel .slick-dots li button {
            background-color: black !important;
          }
          .ant-carousel .slick-dots {
            bottom: 5px; /* fine-tune spacing if needed */
          }
        `}
      </style>
    </Col>
  );
};

export default CarouselComponent;
