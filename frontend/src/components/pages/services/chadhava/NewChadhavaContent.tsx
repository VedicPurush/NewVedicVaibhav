"use client";

import { useState } from 'react';
import Image from 'next/image';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';

const NewChadhavaContent = ({
    pujaReasons = [
        {
            title: "Remove Obstacles & Success",
            desc: "Clears negativity and paves the way for success in personal and professional life."
        },
        {
            title: "Health & Well-being",
            desc: "Promotes good health, longevity, and protection from ailments."
        },
        {
            title: "Family Harmony",
            desc: "Brings peace, unity, and happiness to the family and relationships."
        }
    ],
    contentBenefits = [
        {
            id: 1,
            image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/mandirimage-1.png",
            title: "Personalized Offering",
            desc: "Offering at the temple in your name"
        },
        {
            id: 2,
            image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/puja-2.png",
            title: "Get Your Puja Moments",
            desc: "Receive Your Puja Video on WhatsApp"
        },
        {
            id: 3,
            image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/box-3.png",
            title: "Sacred Prasad Delivery",
            desc: "Prasad from temple delivered to your home"
        }
    ]
}: {
    pujaReasons?: { title: string; desc: string }[];
    contentBenefits?: { id: number; image: string; title: string; desc: string }[];
}) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
    const benefits = contentBenefits;

    const toggleAccordion = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="bg-[#FFF5ED]   px-4 py-6 font-sans">
            {/* ---------------- Why Perform This Puja ---------------- */}
            <section className="mb-8">
                <h2 className="mb-4 text-[18px] font-bold text-gray-900">Why Perform This Puja</h2>
                <div className="divide-y divide-orange-200/50">
                    {pujaReasons.map((item, index) => (
                        <div key={index} className="py-3">
                            <button
                                onClick={() => toggleAccordion(index)}
                                className="flex w-full items-center justify-between text-left"
                            >
                                <span className="text-[15px] font-medium text-gray-800">{item.title}</span>
                                {expandedIndex === index ? (
                                    <KeyboardArrowDown className="text-gray-600" />
                                ) : (
                                    <KeyboardArrowRight className="text-gray-400" />
                                )}
                            </button>

                            <div
                                className={`grid transition-all duration-300 ease-in-out ${expandedIndex === index ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                                    }`}
                            >
                                <div className="overflow-hidden">
                                    <div
                                        className="text-[13px] leading-relaxed text-gray-500 prose-sm prose-p:my-1 w-full"
                                        dangerouslySetInnerHTML={{ __html: item.desc }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ---------------- What You'll Get ---------------- */}
            <section>
                <h2 className="mb-4 text-[18px] font-bold text-gray-900">What You&apos;ll Get</h2>
                <div className="grid grid-cols-3 gap-2">
                    {benefits.map((benefit) => (
                        <div
                            key={benefit.id}
                            className="flex flex-col items-center rounded-2xl bg-white p-2 py-3 text-center shadow-[0_4px_12px_rgba(0,0,0,0.04)] ring-1 ring-black/5"
                        >
                            <div className="mb-2 flex h-10 w-10 items-center justify-center">
                                {/* Resized by next/image — the source PNGs are far larger than 40px. */}
                                <Image
                                    src={benefit.image}
                                    alt={benefit.title}
                                    width={40}
                                    height={40}
                                    className="h-full w-full object-contain"
                                />
                            </div>
                            <h3 className="mb-1 text-[11px] font-bold leading-tight text-gray-900">
                                {benefit.title}
                            </h3>
                            <p className="text-[9px] text-gray-500 leading-tight">
                                {benefit.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default NewChadhavaContent;
