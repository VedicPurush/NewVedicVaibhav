"use client";

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { gtag } from '@/lib/gtag';
import HeroBanner from './components/HeroBanner';
import CampaignIntro from './components/CampaignIntro';
import Navbar from '../Components/Navbar';
import StickyBar from './components/StickyBar';
import { IJyotirlinga } from '../index';

const ThirdComponent = lazy(() => import('./components/ThirdComponent'));
const FourthComponent = lazy(() => import('./components/FourthComponent'));
const BenefitsSection = lazy(() => import('./components/BenefitsSection'));
const ReviewsSection = lazy(() => import('./components/ReviewsSection'));
const FifthComponent = lazy(() => import('./components/FifthComponent'));
const Footer = lazy(() => import('../Components/Footer'));

interface StartpageJyotirlingProps {
    jyotirlingas: IJyotirlinga[];
}

const StartpageJyotirling: React.FC<StartpageJyotirlingProps> = ({ jyotirlingas }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activePlanIndex, setActivePlanIndex] = useState(0);

    // ViewContent — fire when mobile landing page loads
    useEffect(() => {
        const fbq = (window as any).fbq;
        if (typeof fbq === "function") {
            try {
                fbq("track", "ViewContent", {
                    content_ids: ["12-jyotirlinga"],
                    content_name: "12 Jyotirlinga Subscription",
                    content_category: "12 Jyotirlinga Subscription",
                    content_type: "product",
                    currency: "INR",
                });
            } catch (e) {
                console.warn("fbq ViewContent failed", e);
            }
        }
        gtag("event", "view_item", {
            currency: "INR",
            items: [{
                item_id: "12-jyotirlinga",
                item_name: "12 Jyotirlinga Subscription",
                item_category: "12 Jyotirlinga Subscription",
            }],
        });
    }, []);

    // Initialise all selected when data arrives
    useEffect(() => {
        if (jyotirlingas.length > 0) {
            setSelectedIds(jyotirlingas.map((j) => j._id));
        }
    }, [jyotirlingas]);

    // Auto-scroll to the packages section on landing so the user can pick a plan immediately
    const didAutoScrollRef = useRef(false);
    useEffect(() => {
        if (jyotirlingas.length === 0) return; // wait until data (and the section) can render
        if (didAutoScrollRef.current) return;
        didAutoScrollRef.current = true;

        let attempts = 0;
        const tryScroll = () => {
            const el = document.getElementById("packages-section");
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (attempts++ < 20) {
                setTimeout(tryScroll, 150); // section is lazy-loaded; retry until mounted
            }
        };
        const t = setTimeout(tryScroll, 300);
        return () => clearTimeout(t);
    }, [jyotirlingas.length]);

    const selectedJyotirlingas = jyotirlingas.filter((j) => selectedIds.includes(j._id));

    return (
        <div className="min-h-screen text-[#431407] selection:bg-[#f97316] selection:text-white">
            <Navbar />

            <main className="pt-0 ml-0 mr-0">
                <HeroBanner />
                <CampaignIntro />
                <Suspense fallback={null}>
                     <FourthComponent />
                    {/* <SecondComponent
                        jyotirlingas={jyotirlingas}
                        selectedIds={selectedIds}
                    /> */}
                    <ThirdComponent
                        jyotirlingas={jyotirlingas}
                        selectedJyotirlingas={selectedJyotirlingas}
                        onActivePlanChange={setActivePlanIndex}
                    />
                   
                    <BenefitsSection />
                    <ReviewsSection />
                    <FifthComponent />
                </Suspense>
            </main>

            <Suspense fallback={null}>
                <Footer />
            </Suspense>

            {/* Sticky bottom bar — always on top */}
            <StickyBar
                activePlanIndex={activePlanIndex}
                jyotirlingas={jyotirlingas}
                selectedJyotirlingas={selectedJyotirlingas}
            />
        </div>
    );
};

export default StartpageJyotirling;
