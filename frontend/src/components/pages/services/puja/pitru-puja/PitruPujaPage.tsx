"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import OndemandVideoIcon from "@mui/icons-material/OndemandVideo";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Loadinggif from "@/components/shared/LoadingGif";
import type { PujaPackage } from "./PackageSelectSheet";
import { usePitruPujaQuery } from "@/hooks/queries/usePitruPujaQueries";
import { PITRU_PUJA_ID } from "./constants";
import type { PitruPuja, PitruPujaFeatureCard } from "@/lib/api/pitruPuja.api";

/** The sheet is only reachable behind a tap on "Select Package", so its markup
 *  and its three MUI icons are kept out of the initial bundle — nothing it
 *  contains is needed to paint or interact with the page itself. */
const PackageSelectSheet = dynamic(() => import("./PackageSelectSheet"), { ssr: false });

const BADGE_ICONS = [TempleHinduIcon, NightsStayIcon];
const BADGE_STYLES = [
  "bg-[#FBE7C6] text-[#8A4B12]",
  "bg-[#5C1D1D] text-white",
];

/** Used whenever a feature card has no `image` set — one per position, cycling. */
const FEATURE_FALLBACK_ICONS = [OndemandVideoIcon, LocalFireDepartmentIcon, SelfImprovementIcon];

/** Decorative silhouette shown behind the title/subname/reason block. */
const TITLE_BG_IMAGE_URL =
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/c4290bb8-7174-4b35-9a67-01685410b893-optimized.webp";

/** Shown only until `featureCards` is populated on the puja document. */
const DEFAULT_FEATURE_CARDS: PitruPujaFeatureCard[] = [
  { image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/video-optimized.webp", title: "Get Puja Video", description: "Complete puja video will be shared within 2 days" },
  { image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/pandit%20(1).webp", title: "Proper Rituals Followed", description: "Best Pandit Ji from temple will do your puja" },
  { image: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mantra%20(1).webp", title: "Mantra for Chanting", description: "Special mantra shared to get blessings" },
];

type TabKey = "about" | "benefits" | "mandir";

const TABS: { key: TabKey; label: string }[] = [
  { key: "about", label: "About This Puja" },
  { key: "benefits", label: "Benefits" },
  { key: "mandir", label: "About Mandir" },
];

const ACCENTS: PujaPackage["accent"][] = ["rose", "violet", "amber"];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];

const formatMandirDate = (isoDate?: string): { dateLabel: string } | null => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;
  const day = `${date.getDate()} ${MONTH_ABBR[date.getMonth()]}`;
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  return { dateLabel: `${day}, ${weekday}` };
};

interface PitruPujaPageProps {
  /** Fetched on the server (see lib/server/pitruPujaData.ts) so the first render
   *  already has the banner and copy instead of a loading GIF. */
  serverPuja?: PitruPuja | null;
}

const PitruPujaPage: React.FC<PitruPujaPageProps> = ({ serverPuja }) => {
  const [activeTab, setActiveTab] = useState<TabKey>("about");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const router = useRouter();

  const { data: pitruPuja, isLoading } = usePitruPujaQuery(PITRU_PUJA_ID, serverPuja);

  // With `serverPuja` present this gate never fires — the data arrives with the
  // HTML. It remains for the fallback path where the server fetch failed (or
  // the page was prerendered at build time), which still loads client-side.
  // `!pitruPuja` also covers the brief window right after hydration where the
  // query hasn't started fetching yet, which `isLoading` alone misses.
  if (isLoading || !pitruPuja) return <Loadinggif />;

  const packages: PujaPackage[] = pitruPuja.packages.map((pkg, index) => ({
    id: `${pkg.label}-${index}`,
    title: pkg.label,
    persons: pkg.personCount,
    price: pkg.price,
    image: pkg.image,
    accent: ACCENTS[index % ACCENTS.length],
  }));

  const mandirDate = formatMandirDate(pitruPuja.mandirDate?.[0]);
  const bannerImage = pitruPuja.bannerImages?.[0];
  const bannerBgImage = pitruPuja.bannerImages?.[1];

  const handleProceed = (pkg: PujaPackage) => {
    setIsSheetOpen(false);
    const params = new URLSearchParams({
      packageId: pkg.id,
      title: pkg.title,
      persons: String(pkg.persons),
      price: String(pkg.price),
      ...(mandirDate ? { dateLabel: mandirDate.dateLabel } : {}),
      ...(pitruPuja.mandirName ? { mandirName: pitruPuja.mandirName } : {}),
      ...(pitruPuja.mandirPlace ? { mandirPlace: pitruPuja.mandirPlace } : {}),
      ...(pkg.image ? { image: pkg.image } : {}),
    });
    router.push(`/services/puja/pitru-dosh-shanti-puja/book?${params.toString()}`);
  };

  return (
    <>
      <style>{`
        .pitru-rich-text span { background-color: transparent !important; color: inherit !important; }
        .pitru-rich-text p:empty { display: none; }
        .pitru-rich-text p { margin-bottom: 0.5rem; }
      `}</style>
      <Navbar activeIndex="puja" />

      <div className="bg-[#FFF8F0] pt-[6vh] pb-28">
        <div className="max-w-3xl mx-auto px-3 md:px-0">
          {/* Banner */}
          {bannerImage && (
            <div className="relative rounded-3xl overflow-hidden shadow-lg">
              <img
                loading="eager"
                fetchPriority="high"
                width={768}
                height={320}
                src={bannerImage}
                alt={pitruPuja.pujaName}
                className="w-full h-[220px] md:h-[320px] object-cover bg-[#F4E4CC]"
              />
              {bannerBgImage && (
                <img
                  loading="lazy"
                  src={bannerBgImage}
                  alt=""
                  aria-hidden
                  className="absolute bottom-0 right-0 h-[70%] max-w-[45%] object-contain object-right-bottom pointer-events-none"
                />
              )}
            </div>
          )}

          {/* Badges */}
          {pitruPuja.festiveTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {pitruPuja.festiveTags.map((tag, index) => {
                const Icon = BADGE_ICONS[index % BADGE_ICONS.length];
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1.5 rounded-full text-[11px] md:text-[12px] font-semibold px-3.5 py-1.5 ${
                      BADGE_STYLES[index % BADGE_STYLES.length]
                    }`}
                  >
                    <Icon style={{ fontSize: 15 }} />
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title + subtitle + reason, wrapped around a decorative side image */}
          <div className="relative mt-4">
            <img
              loading="lazy"
              src={TITLE_BG_IMAGE_URL}
              alt=""
              aria-hidden
              className="absolute top-0 -right-3 md:right-0 h-40 md:h-56 w-[42%] md:w-[38%] object-cover object-right pointer-events-none select-none"
            />
            <div className="relative pr-24 md:pr-48">
              <h1 className="font-display text-[26px] md:text-[34px] font-bold leading-tight text-[#5C1D1D]">
                {pitruPuja.pujaName}
              </h1>
              {pitruPuja.subName && (
                <p className="font-elegant text-[15px] md:text-[17px] text-[#8A4B12] mt-1.5">
                  {pitruPuja.subName}
                </p>
              )}
              {pitruPuja.reason && (
                <p className="italic text-[13px] md:text-[14px] text-stone-500 mt-3 leading-relaxed">
                  {pitruPuja.reason}
                </p>
              )}
            </div>
          </div>

          {/* Location + Date chips */}
          {(pitruPuja.mandirName || mandirDate) && (
            <div className="flex flex-row gap-2 my-6">
              {pitruPuja.mandirName && (
                <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm flex-1">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#5C1D1D] shrink-0">
                    <LocationOnIcon style={{ fontSize: 18, color: "#fff" }} />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-stone-800">{pitruPuja.mandirName}</div>
                    {pitruPuja.mandirPlace && (
                      <div className="text-[12px] text-stone-500">{pitruPuja.mandirPlace}</div>
                    )}
                  </div>
                </div>
              )}
              {mandirDate && (
                <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-sm flex-1">
                  <span className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C98A3B] shrink-0">
                    <CalendarTodayIcon style={{ fontSize: 16, color: "#fff" }} />
                  </span>
                  <div className="leading-tight">
                    <div className="text-[13px] font-semibold text-stone-800">{mandirDate.dateLabel}</div>
                    {pitruPuja.festiveName && (
                      <div className="text-[12px] text-stone-500">{pitruPuja.festiveName}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mt-6">
            {(pitruPuja.featureCards?.length ? pitruPuja.featureCards : DEFAULT_FEATURE_CARDS).map(
              (card, index) => {
                const FallbackIcon = FEATURE_FALLBACK_ICONS[index % FEATURE_FALLBACK_ICONS.length];
                return (
                  <div
                    key={`${card.title}-${index}`}
                    className="bg-white rounded-2xl shadow-sm px-2 py-2 flex flex-col items-center text-center gap-1"
                  >
                    {card.image ? (
                      <img
                        loading="lazy"
                        src={card.image}
                        alt={card.title}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FBE7C6]">
                        <FallbackIcon style={{ fontSize: 20, color: "#C98A3B" }} />
                      </span>
                    )}
                    <div className="text-[12px] md:text-[13px] font-semibold text-stone-800 leading-tight">
                      {card.title}
                    </div>
                    <div className="text-[10px] md:text-[11px] text-stone-500 leading-snug">
                      {card.description}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-stone-200 flex gap-6">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-2.5 text-[13px] md:text-[14px] font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.key
                    ? "text-[#5C1D1D] border-[#5C1D1D]"
                    : "text-stone-400 border-transparent hover:text-stone-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="mt-4 pitru-rich-text text-[13px] md:text-[14px] leading-relaxed text-stone-600">
            {activeTab === "about" && <div dangerouslySetInnerHTML={{ __html: pitruPuja.about }} />}
            {activeTab === "benefits" && (
              <ul className="space-y-2 list-disc pl-4">
                {pitruPuja.benefits.map((benefit) => (
                  <li key={benefit}>{benefit}</li>
                ))}
              </ul>
            )}
            {activeTab === "mandir" && <div dangerouslySetInnerHTML={{ __html: pitruPuja.aboutMandir }} />}
          </div>
        </div>
      </div>

      {/* Sticky Select Package bar */}
      {packages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-transparent px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => setIsSheetOpen(true)}
              className="w-full rounded-full bg-[#EA6A12] hover:bg-[#d55e0a] text-white font-semibold text-[15px] py-3 shadow-md transition-colors"
            >
              Select Package
            </button>
          </div>
        </div>
      )}

      {/* Mounted only once opened, so the chunk is requested on the tap that
          needs it rather than during hydration. */}
      {isSheetOpen && (
        <PackageSelectSheet
          isOpen={isSheetOpen}
          packages={packages}
          selectedId={selectedPackageId || packages[0]?.id || ""}
          onSelect={setSelectedPackageId}
          onClose={() => setIsSheetOpen(false)}
          onProceed={handleProceed}
        />
      )}

      <Footer />
    </>
  );
};

export default PitruPujaPage;
