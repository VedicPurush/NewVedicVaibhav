"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import OndemandVideoOutlinedIcon from "@mui/icons-material/OndemandVideoOutlined";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Loadinggif from "@/components/shared/LoadingGif";
import { usePitruPujaQuery } from "@/hooks/queries/usePitruPujaQueries";
import { fbqTrack } from "@/lib/meta-pixel";
import { pitruPujaHref } from "./constants";
import PujaCountdown from "./PujaCountdown";
import {
  getNextPitruPujaDate,
  type PitruPuja,
  type PitruPujaBenefit,
  type PitruPujaFaq,
  type PitruPujaFeatureCard,
} from "@/lib/api/pitruPuja.api";

const MAROON = "#8E1529";

const BADGE_ICONS = [TempleHinduIcon, NightsStayIcon];
const BADGE_STYLES = [
  "bg-[#FDE9D3] text-[#E0701F] border border-[#F2B27A]",
  "bg-[#262F7E] text-white border border-[#262F7E]",
];

/** "ॐ" has no MUI icon, so the third fallback is rendered as text. */
const OmIcon = ({ style }: { style?: React.CSSProperties }) => (
  <span style={{ ...style, lineHeight: 1, fontWeight: 700 }}>ॐ</span>
);

/** Used whenever a feature card has no `image` set — one per position, cycling. */
const FEATURE_FALLBACK_ICONS = [OndemandVideoOutlinedIcon, SelfImprovementIcon, OmIcon];

/** Shown only until `featureCards` is populated on the puja document. */
const DEFAULT_FEATURE_CARDS: PitruPujaFeatureCard[] = [
  { title: "Get Puja Video", description: "Complete puja video will be shared within 2 days" },
  { title: "Proper Ritual Followed", description: "Best Pandit Ji from temple will do your puja" },
  { title: "Mantra for Chanting", description: "Special mantra shared to get blessings" },
];

/** Shown only until `faqs` is populated on the puja document. */
const DEFAULT_FAQS: PitruPujaFaq[] = [
  {
    question: "How do I know my Puja was actually performed?",
    answer: "The complete video of your puja, including the sankalp taken in your name, is shared with you within 2 days of the puja.",
  },
  {
    question: "Is Vedic vaibhav authorized by the temple?",
    answer: "Your puja is performed at the temple by Pandit Ji from the temple itself, following the proper rituals.",
  },
  {
    question: "I don't know my Gotra-can I still book?",
    answer: "Yes. If you do not know your Gotra, the sankalp is taken with Kashyap Gotra, as is the tradition.",
  },
];

const BENEFIT_STYLES = [
  { card: "bg-[#FFF1F1] border-[#F3C9C9]", icon: "bg-[#A3162C]", link: "text-[#A3162C]" },
  { card: "bg-[#EFF3FF] border-[#CAD6F6]", icon: "bg-[#3E5BD8]", link: "text-[#3E5BD8]" },
  { card: "bg-[#F0FAF0] border-[#C8EAC8]", icon: "bg-[#2E9E45]", link: "text-[#2E9E45]" },
];

const PACKAGE_STYLES = [
  { chip: "bg-[#E7EEFF] text-[#3E5BD8]", price: "text-[#4A2BD0]" },
  { chip: "bg-[#EFE7FF] text-[#7A3FD8]", price: "text-[#4A2BD0]" },
  { chip: "bg-[#FFEEDC] text-[#E0701F]", price: "text-[#E0701F]" },
];

/** Descriptions longer than this are clamped to two lines behind "Read more". */
const BENEFIT_CLAMP_CHARS = 90;

type SectionKey = "about" | "benefits" | "mandir" | "package" | "faq";

const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About This Puja",
  benefits: "Benefits",
  mandir: "About Mandir",
  package: "Package",
  faq: "FAQ",
};

const sectionDomId = (key: SectionKey) => `pitru-${key}`;

/** Pinned to IST so the server render and the browser agree on the day. */
const formatMandirDate = (isoDate?: string): string | null => {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;
  const part = (options: Intl.DateTimeFormatOptions) =>
    date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", ...options });
  return `${part({ day: "numeric" })} ${part({ month: "short" })}, ${part({ weekday: "short" })}`;
};

/** `benefits` used to be plain strings; accept both until every document is migrated. */
const normalizeBenefit = (benefit: string | PitruPujaBenefit): PitruPujaBenefit =>
  typeof benefit === "string" ? { title: benefit, description: "" } : benefit;

const PARAGRAPH_BREAK = /<\/p>\s*<p(?:\s[^>]*)?>/;
const plainText = (html: string) => html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");

/**
 * Copy pasted into the admin editor from a fixed-width source arrives as one
 * `<p>` per visual line, which renders as a sentence broken across paragraphs.
 * A break is treated as such a soft wrap when the next line starts with
 * whitespace or the previous one stops mid-sentence; real paragraph breaks
 * (previous line ends in punctuation, next starts cleanly) are kept.
 */
const joinWrappedParagraphs = (html: string): string => {
  const pieces = html.split(PARAGRAPH_BREAK);
  return pieces.reduce((out, piece, index) => {
    if (index === 0) return piece;
    const prev = plainText(pieces[index - 1]).trimEnd();
    const next = plainText(piece);
    const isSoftWrap = /^\s/.test(next) || (prev !== "" && !/[.!?:।॥]["')]*$/.test(prev));
    return out + (isSoftWrap ? " " : "</p><p>") + piece;
  }, "");
};

const formatPrice = (price: number) => `₹${price.toLocaleString("en-IN")}/-`;

interface PujaPackage {
  id: string;
  title: string;
  persons: number;
  price: number;
  image?: string;
}

const SectionHeading: React.FC<{ title: string; highlighted?: boolean }> = ({ title, highlighted }) => (
  <div
    className={`flex items-center gap-2 py-1.5 mb-3 ${
      highlighted ? "bg-gradient-to-r from-[#FDE4E4] via-[#FFF4F4] to-transparent -mx-3 px-3" : ""
    }`}
  >
    <span className="w-[5px] h-5 rounded-full bg-gradient-to-b from-[#7A0F1F] to-[#F2B8B8] shrink-0" />
    <h2 className="font-heading text-[18px] md:text-[20px] text-[#7A0F1F] leading-none">{title}</h2>
  </div>
);

interface PitruPujaPageProps {
  /** Fetched on the server (see lib/server/pitruPujaData.ts) so the first render
   *  already has the banner and copy instead of a loading GIF. */
  serverPuja?: PitruPuja | null;
  /** Which puja this route is for — the document's own unique id. */
  pujaId: string;
}

const PitruPujaPage: React.FC<PitruPujaPageProps> = ({ serverPuja, pujaId }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>("about");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [expandedBenefits, setExpandedBenefits] = useState<Set<number>>(new Set());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const { data } = usePitruPujaQuery(pujaId, serverPuja);

  // `initialData` is ignored whenever the cache already holds this key, so a copy
  // restored from IndexedDB — possibly empty, or older than the latest admin
  // edit — would win over the document the server just fetched. Prefer the
  // server copy; the cache only fills in when the server fetch failed, and the
  // loading GIF only shows while that fallback query is still in flight.
  const pitruPuja = serverPuja ?? data;

  // Meta ViewContent — the top of this funnel. Declared above the loading early
  // return so the hook order stays stable, and it no-ops until the puja
  // document has actually arrived. The ref keeps it to one event per puja: the
  // cache fallback can hand back a fresh object reference on a later render.
  const viewTrackedRef = useRef("");
  useEffect(() => {
    if (!pitruPuja || viewTrackedRef.current === pitruPuja.pujaId) return;
    viewTrackedRef.current = pitruPuja.pujaId;

    const prices = pitruPuja.packages.map((pkg) => pkg.price).filter((price) => Number.isFinite(price));

    fbqTrack("ViewContent", {
      content_ids: [pitruPuja.pujaId],
      content_name: pitruPuja.pujaName,
      content_category: "Pitru Puja",
      content_type: "product",
      // Cheapest package: the price a visitor is being shown an entry point to.
      ...(prices.length ? { value: Math.min(...prices), currency: "INR" } : {}),
    });
  }, [pitruPuja]);

  if (!pitruPuja) return <Loadinggif />;

  const packages: PujaPackage[] = pitruPuja.packages.map((pkg, index) => ({
    id: `${pkg.label}-${index}`,
    title: pkg.label,
    persons: pkg.personCount,
    price: pkg.price,
    image: pkg.image,
  }));
  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

  const benefits = (pitruPuja.benefits ?? []).map(normalizeBenefit);
  const faqs = pitruPuja.faqs?.length ? pitruPuja.faqs : DEFAULT_FAQS;
  const featureCards = pitruPuja.featureCards?.length ? pitruPuja.featureCards : DEFAULT_FEATURE_CARDS;
  const nextPujaDate = getNextPitruPujaDate(pitruPuja.mandirDate);
  const mandirDate = formatMandirDate(nextPujaDate);
  const bannerImage = pitruPuja.bannerImages?.[0];

  const sections: SectionKey[] = [
    "about",
    ...(benefits.length ? (["benefits"] as const) : []),
    ...(pitruPuja.aboutMandir ? (["mandir"] as const) : []),
    ...(packages.length ? (["package"] as const) : []),
    ...(faqs.length ? (["faq"] as const) : []),
  ];

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    document.getElementById(sectionDomId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleBenefit = (index: number) =>
    setExpandedBenefits((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const handleProceed = () => {
    if (!selectedPackage) return;
    const params = new URLSearchParams({
      packageId: selectedPackage.id,
      title: selectedPackage.title,
      persons: String(selectedPackage.persons),
      price: String(selectedPackage.price),
      ...(mandirDate ? { dateLabel: mandirDate } : {}),
      ...(pitruPuja.mandirName ? { mandirName: pitruPuja.mandirName } : {}),
      ...(pitruPuja.mandirPlace ? { mandirPlace: pitruPuja.mandirPlace } : {}),
      ...(selectedPackage.image ? { image: selectedPackage.image } : {}),
    });
    router.push(`${pitruPujaHref(pujaId)}/book?${params.toString()}`);
  };

  return (
    <>
      <style>{`
        .pitru-rich-text span { background-color: transparent !important; color: inherit !important; }
        .pitru-rich-text p:empty { display: none; }
        .pitru-rich-text p { margin-bottom: 0.25rem; }
        /* Admin-pasted copy can carry a wide image, table or an unbroken URL —
           clamp it so it never widens the page on a 320px phone. */
        .pitru-rich-text { overflow-wrap: break-word; }
        .pitru-rich-text img, .pitru-rich-text table { max-width: 100%; height: auto; }
        /* The tab strip scrolls below ~380px. The global scrollbar rules paint a
           thick orange bar there, which reads as a second border under the tabs,
           so this one is 3px and barely tinted. */
        .pitru-tabs { scrollbar-width: thin; scrollbar-color: rgba(122,15,31,0.28) transparent; }
        .pitru-tabs::-webkit-scrollbar { height: 3px; background: transparent; }
        .pitru-tabs::-webkit-scrollbar-track { background: transparent; }
        .pitru-tabs::-webkit-scrollbar-thumb { background: rgba(122,15,31,0.28); border-radius: 999px; }
      `}</style>
      <Navbar activeIndex="puja" />

      <div className="bg-white pt-[6vh]">
        <div className="max-w-3xl mx-auto px-3 md:px-0 mt-2">
          {/* Banner */}
          {bannerImage && (
            <div className="rounded-[18px] md:rounded-[24px] overflow-hidden">
              <img
                loading="eager"
                fetchPriority="high"
                width={768}
                height={196}
                src={bannerImage}
                alt={pitruPuja.pujaName}
                className="w-full h-[186px] md:h-[320px] object-cover bg-[#D9D9D9]"
              />
            </div>
          )}

          {/* Badges */}
          {pitruPuja.festiveTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {pitruPuja.festiveTags.map((tag, index) => {
                const Icon = BADGE_ICONS[index % BADGE_ICONS.length];
                return (
                  <span
                    key={tag}
                    className={`inline-flex items-center gap-1 rounded-full text-[12px] md:text-[13px] px-2.5 py-1 ${
                      BADGE_STYLES[index % BADGE_STYLES.length]
                    }`}
                  >
                    <Icon style={{ fontSize: 14 }} />
                    {tag}
                  </span>
                );
              })}
            </div>
          )}

          {/* Title + subtitle + reason */}
          <h1
            className="font-bold text-[24px] min-[360px]:text-[26px] md:text-[34px] leading-[1.15] text-[#7A0F1F] mt-3 break-words"
            style={{ fontFamily: "'Secular One', sans-serif" }}
          >
            {pitruPuja.pujaName}
          </h1>
          {pitruPuja.subName && (
            <p className="text-[14px] md:text-[16px] font-medium text-[#E8743B] mt-1.5 pb-2 border-b border-dashed border-[#F2B27A]">
              {pitruPuja.subName}
            </p>
          )}
          {pitruPuja.reason && (
            <p className="italic text-[12px] md:text-[13px] text-stone-500 mt-2 leading-relaxed">
              {pitruPuja.reason}
            </p>
          )}

          {/* Mandir + Date strip */}
          {(pitruPuja.mandirName || mandirDate) && (
            <div className="flex items-stretch bg-[#8D1B2E] rounded-xl mt-4 py-2.5 md:py-3 text-white">
              {pitruPuja.mandirName && (
                <div className="flex items-center gap-2 md:gap-3 flex-1 px-3 md:px-4 min-w-0">
                  <TempleHinduIcon style={{ fontSize: 24 }} className="shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="italic text-[12px] md:text-[14px] break-words line-clamp-2">
                      {pitruPuja.mandirName}
                    </div>
                    {pitruPuja.mandirPlace && (
                      <div className="italic text-[10px] md:text-[11px] opacity-80 truncate">
                        {pitruPuja.mandirPlace}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {pitruPuja.mandirName && mandirDate && <div className="w-px bg-white/70 my-0.5" />}
              {mandirDate && (
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-fit pl-2.5 pr-2 md:basis-[30%] md:pl-3">
                  <CalendarMonthOutlinedIcon style={{ fontSize: 18 }} className="shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="italic text-[12px] md:text-[14px] whitespace-nowrap">{mandirDate}</div>
                    {/* Capped rather than wrapped: this column never gives width
                        back, so a long festive name would leave the mandir name a
                        two-character strip on a 320px screen. */}
                    {pitruPuja.festiveName && (
                      <div className="italic text-[10px] md:text-[11px] opacity-80 truncate max-w-[84px] min-[360px]:max-w-[104px] md:max-w-none">
                        {pitruPuja.festiveName}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 md:gap-4 mt-4">
            {featureCards.map((card, index) => {
              const FallbackIcon = FEATURE_FALLBACK_ICONS[index % FEATURE_FALLBACK_ICONS.length];
              return (
                <div
                  key={`${card.title}-${index}`}
                  className="bg-white border border-stone-200 rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.12)] px-1 min-[360px]:px-1.5 py-3.5 md:py-4 flex flex-col items-center text-center gap-1.5 min-w-0"
                >
                  {card.image ? (
                    <img loading="lazy" src={card.image} alt="" className="w-8 h-8 object-contain" />
                  ) : (
                    <FallbackIcon style={{ fontSize: 28, color: MAROON }} />
                  )}
                  <div className="text-[11px] min-[360px]:text-[12px] md:text-[13px] font-medium text-[#7A0F1F] leading-tight break-words">
                    {card.title}
                  </div>
                  <div className="text-[9.5px] md:text-[11px] text-stone-500 leading-snug break-words">
                    {card.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section tabs */}
        <div className="mt-4 border-y border-stone-300">
          <div className="pitru-tabs max-w-3xl mx-auto px-3 md:px-0 flex justify-between gap-2 md:gap-3 overflow-x-auto">
            {sections.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => scrollToSection(key)}
                className={`shrink-0 whitespace-nowrap py-2.5 text-[11.5px] min-[360px]:text-[12px] md:text-[14px] border-b-2 transition-colors ${
                  activeSection === key
                    ? "font-semibold text-stone-900 border-[#7A0F1F]"
                    : "text-stone-700 border-transparent hover:text-stone-900"
                }`}
              >
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-3 md:px-0">
          {/* About This Puja */}
          <section id={sectionDomId("about")} className="scroll-mt-28 mt-5">
            <SectionHeading title="About This Puja" highlighted />
            <div
              className="pitru-rich-text border border-[#B4475A] rounded-xl px-3 py-3 text-[12px] md:text-[14px] leading-[1.9] text-stone-600"
              dangerouslySetInnerHTML={{ __html: joinWrappedParagraphs(pitruPuja.about) }}
            />
          </section>

          {/* Benefits */}
          {benefits.length > 0 && (
            <section id={sectionDomId("benefits")} className="scroll-mt-28 mt-6">
              <SectionHeading title="Benefits" />
              <div className="space-y-3">
                {benefits.map((benefit, index) => {
                  const style = BENEFIT_STYLES[index % BENEFIT_STYLES.length];
                  const isLong = benefit.description.length > BENEFIT_CLAMP_CHARS;
                  const isExpanded = expandedBenefits.has(index);
                  return (
                    <div
                      key={`${benefit.title}-${index}`}
                      className={`flex items-start gap-3 border rounded-xl px-3 py-3 ${style.card}`}
                    >
                      <span
                        className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${style.icon}`}
                      >
                        <VerifiedUserIcon style={{ fontSize: 18, color: "#fff" }} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] md:text-[15px] font-medium text-stone-900 leading-snug">
                          {benefit.title}
                        </div>
                        {benefit.description && (
                          <p className="text-[11px] md:text-[13px] text-stone-500 leading-snug mt-1">
                            <span className={isLong && !isExpanded ? "line-clamp-2" : undefined}>
                              {benefit.description}
                            </span>
                            {isLong && (
                              <button
                                type="button"
                                onClick={() => toggleBenefit(index)}
                                className={`font-medium ${style.link}`}
                              >
                                {isExpanded ? "Read less" : "Read more"}
                              </button>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* About The Mandir */}
          {pitruPuja.aboutMandir && (
            <section id={sectionDomId("mandir")} className="scroll-mt-28 mt-6">
              <SectionHeading title="About The Mandir" />
              <div
                className="pitru-rich-text border border-[#B4475A] rounded-xl px-3 py-3 text-[12px] md:text-[14px] leading-[1.9] text-stone-600"
                dangerouslySetInnerHTML={{ __html: joinWrappedParagraphs(pitruPuja.aboutMandir) }}
              />
            </section>
          )}

          {/* Packages */}
          {packages.length > 0 && (
            <section id={sectionDomId("package")} className="scroll-mt-28 mt-6">
              <SectionHeading title="Select your Puja Package" />
              <div className="space-y-3" role="radiogroup" aria-label="Puja package">
                {packages.map((pkg, index) => {
                  const style = PACKAGE_STYLES[index % PACKAGE_STYLES.length];
                  const isSelected = pkg.id === selectedPackage?.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setSelectedPackageId(pkg.id)}
                      className={`w-full flex items-center gap-2 min-[360px]:gap-3 rounded-xl border px-2 py-3 text-left transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.08)] ${
                        isSelected
                          ? "bg-gradient-to-r from-[#FFD9D9] to-[#FFF6F6] border-[#C0445A]"
                          : "bg-white border-stone-200"
                      }`}
                    >
                      {pkg.image && (
                        <img
                          loading="lazy"
                          src={pkg.image}
                          alt={pkg.title}
                          className="w-20 h-14 min-[360px]:w-24 min-[360px]:h-16 md:w-32 md:h-20 object-contain shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0 font-body">
                        <div className="text-[14px] min-[360px]:text-[15px] md:text-[17px] font-medium text-stone-900 break-words">
                          {pkg.title}
                        </div>
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full text-[10px] md:text-[12px] px-2 py-0.5 mt-0.5 ${style.chip}`}
                        >
                          <PersonOutlineIcon style={{ fontSize: 13 }} />
                          For {pkg.persons} Pitru
                        </span>
                        <div
                          className={`text-[18px] min-[360px]:text-[20px] md:text-[22px] font-medium leading-tight mt-0.5 ${style.price}`}
                        >
                          {formatPrice(pkg.price)}
                        </div>
                      </div>
                      <span
                        className={`self-start flex items-center justify-center w-4 h-4 rounded-full border shrink-0 ${
                          isSelected ? "border-[#C0445A] bg-white" : "border-stone-300 bg-stone-100"
                        }`}
                      >
                        {isSelected && <span className="w-2 h-2 rounded-full bg-[#C0445A]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* FAQ */}
        {faqs.length > 0 && (
          <section id={sectionDomId("faq")} className="scroll-mt-28 mt-6 bg-[#FFF6E8] py-4">
            <div className="max-w-3xl mx-auto px-3 md:px-0">
              <SectionHeading title="Frequently Asked Questions" />
              <div className="space-y-2.5">
                {faqs.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div key={`${faq.question}-${index}`} className="bg-white border border-[#8D1B2E] rounded-xl overflow-hidden">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left"
                      >
                        <span className="text-[12px] md:text-[14px] font-semibold text-stone-900">{faq.question}</span>
                        <ArrowDropDownIcon
                          style={{ fontSize: 24, color: MAROON }}
                          className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div
                          className="pitru-rich-text px-2.5 pb-2.5 text-[12px] md:text-[13px] leading-relaxed text-stone-600"
                          dangerouslySetInnerHTML={{ __html: faq.answer }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Sticky bar — "Select Package" scrolls to the list; once a package is
          picked it turns into a price summary that proceeds to booking. */}
      {packages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white px-3 py-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto">
            <PujaCountdown isoDate={nextPujaDate} />
            {selectedPackage ? (
              <button
                type="button"
                onClick={handleProceed}
                className="w-full flex items-center justify-between gap-2 min-[360px]:gap-3 rounded-xl [&:not(:first-child)]:rounded-t-none bg-[#6B0F1A] hover:bg-[#560b14] text-white px-3 min-[360px]:px-4 py-2 text-left transition-colors"
              >
                <span className="min-w-0 leading-tight">
                  <span className="block text-[16px] min-[360px]:text-[17px] font-medium whitespace-nowrap">
                    {formatPrice(selectedPackage.price)}
                  </span>
                  <span className="block text-[12px] truncate">{selectedPackage.title}</span>
                </span>
                <span className="shrink-0 w-[36%] min-[360px]:w-[40%] text-center text-[13px] min-[360px]:text-[14px] font-medium tracking-wide">
                  Proceed
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scrollToSection("package")}
                className="w-full rounded-xl [&:not(:first-child)]:rounded-t-none bg-[#6B0F1A] hover:bg-[#560b14] text-white font-medium tracking-wide text-[16px] py-3 transition-colors"
              >
                Select Package
              </button>
            )}
          </div>
        </div>
      )}

      <Footer />
      {/* Room for the fixed bar, so it never covers the bottom of the footer. */}
      {packages.length > 0 && <div aria-hidden className="h-[116px]" />}
    </>
  );
};

export default PitruPujaPage;
