"use client";

import React, { useState } from "react";
import { useMoney, localizeCopy } from "@/lib/currency";
import { useRouter } from "next/navigation";
import LocationOn from '@mui/icons-material/LocationOn';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { useAllPoojas } from "@/hooks/useAllPoojas"; // Hook for fetching poojas
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const PujaBookingSection: React.FC = () => {
  /** `content.price` may come from the API as an already-formatted string
   *  ("₹11000/-") rather than a raw number, so it is localized token-by-token
   *  via localizeCopy() rather than assumed to be a plain money() input. */
  const { money } = useMoney();
  const [activeTab, _setActiveTab] = useState("deepak-seva");
  const [showVideo, setShowVideo] = useState(false);
  const router = useRouter();
  const { data: poojas, isLoading, isError } = useAllPoojas(); // Fetch poojas using the hook

  // Filter poojas based on mandir name "Shri Banke Bihari Ji Mandir"
  const filteredPoojas = poojas?.filter(
    (pooja: { mandir: string; }) => pooja.mandir === "Shri Banke Bihari Ji Mandir"
  );

  // Get the content of the selected tab
  const getTabContent = (): any => {
    if (!filteredPoojas) return {};

    const content = filteredPoojas.find((pooja: { id: string; }) => pooja.id === activeTab);

    return (
      content || {
        title: "Deepak Seva",
        description:
          "Deepak Seva is the offering of oil lamps to Banke Bihari Ji, symbolizing devotion and divine blessings.",
        location: "Shri. Banke Bihari Mandir, Vrindavan (U.P.)",
        price: "₹11000/-",
        buttonText: "Book Puja",
        image:
          "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/shop-images/sample%20(1).webp",
      }
    );
  };

  const content = getTabContent();

  // Loading and Error handling
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error fetching poojas</div>;
  }

  return (
    <>
      <Navbar activeIndex="banke-bihariji" />
      <div className="w-full mt-[10vh] flex justify-center">
        {/* Desktop and above (md+) banner */}
        <img loading="lazy"
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/banner/banke-bihari-ji-optimized.webp"
          alt="Banke Bihari Ji Banner"
          className="w-full hidden md:block"
         />
        {/* Mobile banner below md */}
        <img loading="lazy"
          src="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/shop-images/BankeBiharijiBanner%20(1).webp"
          alt="Banke Bihari Ji Mobile Banner"
          className="w-full block md:hidden"
         />
      </div>

      <div className="bg-orange-50  p-0 md:p-6 pt-4">
        <div className=" max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-5">
            {/* Left Card */}
            <div
              onClick={() => router.push(`/services/puja/687e7037b74af9a76da1db60/select-package`)}
              role="button"
              tabIndex={0}
              className="bg-white rounded-2xl w-[90%] md:w-[50%] shadow-lg overflow-hidden cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-50 bg-gradient-to-br from-orange-300 to-orange-600">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                {/* Simulated temple image with diyas */}
                {content.image && (
                  <img loading="lazy"
                    src={content.image}
                    alt="Temple"
                    className="w-full h-full object-cover"
                   />
                )}
              </div>

              {/* Card Content */}
              <div className="p-3">
                <h3 className="text-2xl font-bold text-[#D26822] mb-1">
                  {content.title}
                </h3>
                <p className="text-gray-600 italic text-sm mb-1  leading-relaxed">
                  {content.description}
                </p>

                <div className="flex items-start gap-2 mb-2">
                  <LocationOn
                    className="text-orange-500 mt-0.5"
                    style={{ fontSize: "16px" }}
                  />
                  <span className="text-gray-600 text-sm">
                    {content.location}
                  </span>
                </div>

                <div className="flex items-center justify-between bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200">
                  <div className="flex items-center  gap-3">
                    <span className="text-sm ">*Starting from</span>
                    <span className="text-lg font-bold ">{localizeCopy(content.price)}</span>
                  </div>
                  {/* Book Puja button removed; card is now clickable */}
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div
              className="bg-gradient-to-br w-[90%] md:w-full h-auto md:h-[380px] from-orange-100 to-orange-200 rounded-2xl shadow-lg p-0 md:p-5 relative overflow-hidden"
              style={{
                backgroundImage:
                  'url("https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/shop-images/BankeBiharijiCardBg.webp")',
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay",
              }}
            >
              {/* Optional overlay for better text readability */}
              <div className="absolute inset-0 bg-orange-200 bg-opacity-40 rounded-2xl"></div>

              <div className="relative z-10 flex md:flex-row flex-col gap-0 md:gap-8 mt-2 md:mt-0 h-full w-full items-center justify-center">

                <div className="flex flex-row md:flex-col mt-5 gap-4">
                  <h2 className=" text-xl mt-5 md:text-3xl text-[#976841] mb-3">
                    Sankalp
                    <br />
                    Deepak Seva in
                  </h2>

                  <div className="bg-[#FFA100] text-white w-full  p-4 md:p-8 rounded-2xl inline-block mb-8 shadow-lg">
                    <div className=" text-2xl md:text-4xl font-bold">
                      Shri.
                      <br />
                      Banke
                      <br />
                      Bihari Ji!
                    </div>
                  </div>
                </div>

                {showVideo ? (
                  <div className="w-full md:w-[60%] h-full">
                    <iframe
                      width="100%"
                      height="100%"
                      src="https://www.youtube.com/embed/8WL_KrKShpA?autoplay=1"
                      title="YouTube Short Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="rounded-2xl"
                    />
                  </div>
                ) : (
                  <div
                    className="relative w-full md:w-[60%] h-full cursor-pointer rounded-2xl overflow-hidden"
                    onClick={() => setShowVideo(true)}
                  >
                    <img loading="lazy"
                      src="https://img.youtube.com/vi/8WL_KrKShpA/hqdefault.jpg"
                      alt="Banke Bihari Ji YouTube Short Thumbnail"
                      className="w-full h-full object-cover"
                     />
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <PlayArrow
                        className="text-white"
                        style={{ fontSize: "48px" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Static info boxes */}
          <div className=" flex  flex-wrap  gap-3  mt-6">

            <div
              onClick={() => router.push('/services/puja/687f6a03b74af9a76da1dca3/select-package')}
              className="bg-white rounded-2xl w-[80%] md:w-[25%] shadow-lg overflow-hidden cursor-pointer mx-auto sm:mx-0"
            >
              <div className="relative h-40 bg-gradient-to-br from-orange-300 to-orange-600">
                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                <img loading="lazy"
                  src="https://vedic-vaibhav.blr1.digitaloceanspaces.com/vedic-vaibhav/pooja-images/images_1753239575560.jpg"
                  alt="Static Box 2"
                  className="w-full h-full object-cover"
                 />
              </div>
              <div className="p-3">
                <h3 className="text-2xl font-bold text-[#D26822] mb-1">Janmashtami Pooja </h3>
                <p className="text-gray-600 italic text-sm mb-1 leading-relaxed">
                  Participating in the Janmashtami Pooja at Banke Bihari Ji Mandir is believed to ....
                </p>
                <div className="flex items-start gap-2 mb-2">
                  <LocationOn className="text-orange-500 mt-0.5" style={{ fontSize: "14px" }} />
                  <span className="text-gray-600 text-xs">Shri Banke Bihari Mandir, Vrindavan (U.P.)</span>
                </div>
                <div className="flex items-center justify-between bg-green-500 text-white px-6 py-2 rounded-lg font-medium">
                  <span className="text-sm">*Starting from</span>
                  <span className="text-lg font-bold">{money(801)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PujaBookingSection;
