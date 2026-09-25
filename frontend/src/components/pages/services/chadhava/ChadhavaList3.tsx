"use client";

import React from "react";
import { motion } from "framer-motion";
import SpaIcon from "@mui/icons-material/Spa";
import { useNewChadhavaListQuery } from "@/hooks/queries/useNewChadhavaListQuery";
import Layout from "@/components/layout/Layout";
import ChadhavaCard3 from "./ChadhavaCard3";

const ChadhavaContent3: React.FC = () => {
    const { data: listData = [], isLoading: loading, isError: error } = useNewChadhavaListQuery();

    return (
        <section className="pb-10 md:py-0 px-4 sm:px-6 ">
            {/* Desktop-only banner */}
            <div className="hidden md:flex justify-center mb-8">
                <div className="rounded-2xl shadow-md border border-yellow-300 bg-gradient-to-r from-[#FFF9EC] via-[#FFE1B2] to-[#FFD399] px-12 py-5 flex items-center gap-5">
                    <SpaIcon className="text-3xl text-[#E69C18]" />
                    <span className="text-xl font-semibold text-[#B96800] tracking-wide drop-shadow-sm">
                        Upcoming Chadhava – Book your offerings and receive divine blessings!
                    </span>
                    <SpaIcon className="text-3xl text-[#E69C18]" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="max-w-xl md:hidden mx-auto p-5 bg-white/20 backdrop-blur-sm rounded-2xl shadow-md flex flex-col items-center gap-2"
            >
                <div className="w-12 h-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 mb-1" />
                <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-900 font-semibold font-sans">
                    <div className="flex items-center gap-2 text-center">
                        <SpaIcon className="text-xl sm:text-2xl text-yellow-500" />
                        <span className="text-xs sm:text-md">Upcoming Chadhava</span>
                        <SpaIcon className="text-xl sm:text-2xl text-yellow-500" />
                    </div>
                </div>
                <p className="text-center text-[10px] md:text-xs text-gray-700">
                    Offer your Chadhava as <span className="font-medium">Arpan</span> and receive divine blessings.
                </p>
            </motion.div>

            {loading ? (
                <p className="text-center mt-10 text-orange-700 font-semibold">
                    Loading chadhava list...
                </p>
            ) : error ? (
                <p className="text-center mt-10 text-red-700 font-semibold">
                    Failed to load chadhava. Please try again.
                </p>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 md:pb-4 mb-0  max-w-7xl mx-auto px-1">
                    {listData.length > 0 ? (
                        listData
                            .filter((item: any) => {
                                const parseBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";
                                if (!parseBool(item.isActive)) return false;

                                const dateStr = item.availableDates?.[0];
                                if (!dateStr) return true;
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return true;
                                date.setHours(23, 59, 59, 999);
                                return new Date() <= date;
                            })
                            .sort((a: any, b: any) => {
                                const dateA = a.availableDates?.[0] ? new Date(a.availableDates[0]).getTime() : Infinity;
                                const dateB = b.availableDates?.[0] ? new Date(b.availableDates[0]).getTime() : Infinity;
                                return dateA - dateB;
                            })
                            .map((item: any) => {
                                const imageUrl = item.chadhavaWebCardImage?.location || item.chadhavaInnerImages?.[0]?.location || "";
                                const date = item.availableDates?.[0] || "";
                                const location = item.selectedMandirs?.[0]?.nameEnglish || "In Temple";
                                const offerings = [item.chadhavaName];

                                return (
                                    <ChadhavaCard3
                                        key={item._id}
                                        id={item._id}
                                        title={item.chadhavaName}
                                        description={item.description}
                                        location={location}
                                        date={date}
                                        imageUrl={imageUrl}
                                        offerings={offerings}
                                    />
                                );
                            })
                    ) : (
                        <p className="col-span-2 text-center mt-6 text-orange-600 font-medium">
                            No Chadhava items available.
                        </p>
                    )}
                </div>
            )}
        </section>
    );
};

/* No background of its own — the site-wide artwork (globals.css, body::before)
   shows through, as on the puja page. A fill here also sat behind the fixed,
   transparent header and turned it into a flat cream band. */
const ChadhavaList3: React.FC = () => {
    return <Layout content={<ChadhavaContent3 />} activeIndex="chadhava" />;
};

export default ChadhavaList3;
