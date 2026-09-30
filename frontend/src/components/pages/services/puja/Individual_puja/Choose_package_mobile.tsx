"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import TempleHinduIcon from "@mui/icons-material/TempleHindu";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import Layout from "@/components/layout/Layout";
import { useAnyPoojaDetailQuery, useMandirByIdQuery } from "@/hooks/useAllPoojas";
import { useMoney } from "@/lib/currency";
import { extractIdFromSlug } from "@/lib/slug";
import {
  buildViewModel,
  formatDateLong,
  PALETTE,
  STATIC,
  sectionDomId,
  SectionHeading,
  SankalpBanner,
  PUJA_SHARED_STYLES,
  type ViewModel,
  type PujaPackage,
} from "./newPujaShared";

/* -------------------------------------------------------------------------- */
/*                            Page-local furniture                            */
/* -------------------------------------------------------------------------- */
type SectionKey = "about" | "benefits" | "mandir" | "package";

const SECTION_LABELS: Record<SectionKey, string> = {
  about: "About This Puja",
  benefits: "Benefits",
  mandir: "About The Temple",
  package: "Package",
};

/* -------------------------------------------------------------------------- */
/*                                   Hero                                     */
/* -------------------------------------------------------------------------- */
const Hero = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  const dateLabel = PUJA.poojaDates[0] ? formatDateLong(PUJA.poojaDates[0]) : "";
  const extraDates = PUJA.poojaDates.length - 1;

  return (
    <div className="max-w-3xl mx-auto px-3 md:px-0 mt-2">
      {/* Banner — a dead URL hides itself rather than drawing a broken image */}
      {PUJA.heroImage && (
        <div className="rounded-[18px] md:rounded-[24px] overflow-hidden">
          <img
            loading="eager"
            fetchPriority="high"
            src={PUJA.heroImage}
            alt={PUJA.mandirName || PUJA.title}
            className="w-full h-[186px] md:h-[320px] object-cover bg-[#D9D9D9]"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}


      {/* Title + Hindi title */}
      <h1
        className=" text-[24px] min-[360px]:text-[24px] md:text-[34px] leading-[1.15] mt-3 break-words"
        style={{ fontFamily: "'Secular One', sans-serif", color: P.textDark }}
      >
        {PUJA.title}
      </h1>
      {PUJA.titleHindi && (
        <p
          className="text-[14px] md:text-[16px] font-medium mt-1.5 pb-2 border-b border-dashed"
          style={{ color: P.textDark, borderColor: P.gold }}
        >
          {PUJA.titleHindi}
        </p>
      )}
      {/* Mandir + date strip */}
      {(PUJA.mandirName || dateLabel) && (
        <div
          className="flex items-stretch rounded-xl mt-4 py-2.5 md:py-3 text-white"
          style={{ backgroundColor: P.raw }}
        >
          {PUJA.mandirName && (
            <div className="flex items-center gap-2 md:gap-3 flex-1 px-3 md:px-4 min-w-0">
              <TempleHinduIcon style={{ fontSize: 24 }} className="shrink-0" />
              <div className="leading-tight min-w-0">
                <div className="italic text-[12px] md:text-[14px] break-words line-clamp-2">
                  {PUJA.mandirName}
                </div>
                {PUJA.state && (
                  <div className="italic text-[10px] md:text-[11px] opacity-80 truncate">{PUJA.state}</div>
                )}
              </div>
            </div>
          )}
          {PUJA.mandirName && dateLabel && <div className="w-px bg-white/70 my-0.5" />}
          {dateLabel && (
            <div className="flex items-center gap-1.5 md:gap-2 shrink-0 min-w-fit pl-2.5 pr-2 md:basis-[30%] md:pl-3">
              <CalendarMonthOutlinedIcon style={{ fontSize: 18 }} className="shrink-0" />
              <div className="leading-tight min-w-0">
                <div className="italic text-[12px] md:text-[14px] whitespace-nowrap">{dateLabel}</div>
                {/* Capped rather than wrapped: this column never gives width
                    back, so a long timing string would leave the mandir name a
                    two-character strip on a 320px screen. */}
                {(PUJA.poojaTime || extraDates > 0) && (
                  <div className="italic text-[10px] md:text-[11px] opacity-80 truncate max-w-[84px] min-[360px]:max-w-[104px] md:max-w-none">
                    {PUJA.poojaTime || `+${extraDates} more`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature cards */}
      <div className="grid grid-cols-3 gap-1.5 min-[360px]:gap-2 md:gap-4 mt-4">
        {PUJA.featureCards.map(({ title, description, Icon }) => (
          <div
            key={title}
            className="bg-white border rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.12)] px-1 min-[360px]:px-1.5 py-3.5 md:py-4 flex flex-col items-center text-center gap-1.5 min-w-0"
            style={{ borderColor: P.line }}
          >
            <Icon style={{ fontSize: 28, color: P.navy }} />
            <div
              className="text-[11px] min-[360px]:text-[12px] md:text-[13px] font-medium leading-tight break-words"
              style={{ color: P.textDark }}
            >
              {title}
            </div>
            <div className="text-[9.5px] md:text-[11px] leading-snug break-words" style={{ color: P.ink }}>
              {description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                About sections                              */
/* -------------------------------------------------------------------------- */
const AboutProse = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
    <section id={sectionDomId("about")} className="scroll-mt-28 mt-5">
      <SectionHeading P={P} title={SECTION_LABELS.about} highlighted />
      <div
        className="puja-rich-text border rounded-xl px-3 py-3 text-[12px] md:text-[14px] leading-[1.9]"
        style={{ borderColor: P.boxLine, color: P.paperInk }}
      >
        {/* admin-authored rich text (headings, bullet lists) from the pooja doc */}
        <div
          className="[&_h2]:mb-2 [&_h2]:text-[16px] [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[14px] [&_h3]:font-bold [&_li]:mb-1 [&_li]:list-disc [&_ol]:mb-3 [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: PUJA.aboutHtml }}
        />

        {PUJA.shastraQuote && (
          <p className="mb-3 mt-3">
            {STATIC.shastraQuoteIntro}{" "}
            <span className="font-semibold" style={{ color: P.orange }}>
              “{PUJA.shastraQuote}”
            </span>
          </p>
        )}

        {PUJA.aboutClosing && <p>{PUJA.aboutClosing}</p>}
      </div>
    </section>
  );
};

const Benefits = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
    <section id={sectionDomId("benefits")} className="scroll-mt-28 mt-6">
      <SectionHeading P={P} title={SECTION_LABELS.benefits} />
      <div className="space-y-3">
        {PUJA.benefits.map((benefit) => (
          <div
            key={benefit.heading}
            className="flex items-start gap-3 border rounded-xl px-3 py-3"
            style={{ backgroundColor: P.paper, borderColor: P.paperLine }}
          >
            <span
              className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
              style={{ backgroundColor: P.navy }}
            >
              <VerifiedUserIcon style={{ fontSize: 18, color: "#fff" }} />
            </span>
            <div className="min-w-0">
              <div className="text-[13px] md:text-[15px] font-medium leading-snug" style={{ color: P.ink }}>
                {benefit.heading}
              </div>
              <p className="text-[11px] md:text-[13px] leading-snug mt-1" style={{ color: P.inkSoft }}>
                {benefit.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const TempleFacts = ({ PUJA }: { PUJA: ViewModel }) => {
  const P = PUJA.palette;
  return (
    <section id={sectionDomId("mandir")} className="scroll-mt-28 mt-6">
      <SectionHeading P={P} title={SECTION_LABELS.mandir} />
      <div className="border rounded-xl px-3 py-3" style={{ borderColor: P.boxLine }}>
        {PUJA.templeFacts.map((row, i) => (
          <div key={row.label}>
            {i > 0 && <div className="my-3 h-px" style={{ backgroundColor: P.line }} />}
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: P.orange }}>
              {row.label}
            </div>
            <div className="mt-1 text-[13px] leading-relaxed" style={{ color: P.ink }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                             Package selection                              */
/* -------------------------------------------------------------------------- */
const PackageSection = ({
  PUJA,
  selected,
  onSelect,
}: {
  PUJA: ViewModel;
  selected: PujaPackage | null;
  onSelect: (label: string) => void;
}) => {
  const { money } = useMoney();
  const P = PUJA.palette;

  return (
    <section id={sectionDomId("package")} className="scroll-mt-28 mt-6">
      <SectionHeading P={P} title="Select your Puja Package" />
      <div className="space-y-3" role="radiogroup" aria-label="Puja package">
        {PUJA.packages.map((pkg) => {
          const isSelected = pkg.label === selected?.label;
          return (
            <button
              key={pkg.label}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(pkg.label)}
              className="w-full flex items-center gap-2 min-[360px]:gap-3 rounded-xl border px-2 py-3 text-left transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.08)]"
              style={
                isSelected
                  ? {
                      backgroundImage: `linear-gradient(to right, ${P.chip}, ${P.cream})`,
                      borderColor: P.navy,
                    }
                  : { backgroundColor: "#fff", borderColor: P.line }
              }
            >
              {pkg.image && (
                <img
                  loading="lazy"
                  src={pkg.image}
                  alt={pkg.label}
                  className="w-20 h-14 min-[360px]:w-24 min-[360px]:h-16 md:w-32 md:h-20 object-contain shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[14px] min-[360px]:text-[15px] md:text-[17px] font-medium break-words"
                  style={{ color: P.ink }}
                >
                  {pkg.label}
                </div>
                <span
                  className="inline-flex items-center gap-0.5 rounded-full text-[10px] md:text-[12px] px-2 py-0.5 mt-0.5 max-w-full"
                  style={{ backgroundColor: P.chip, color: P.chipInk }}
                >
                  <PersonOutlineIcon style={{ fontSize: 13 }} className="shrink-0" />
                  <span className="truncate">
                    {pkg.personCount > 0
                      ? `Yajmaan + ${pkg.personCount} family member${pkg.personCount === 1 ? "" : "s"}`
                      : "Yajmaan only"}
                  </span>
                </span>
                <div
                  className="text-[18px] min-[360px]:text-[20px] md:text-[22px] font-medium leading-tight mt-0.5"
                  style={{ color: P.orange }}
                >
                  {money(pkg.price)}
                </div>
              </div>
              <span
                className="self-start flex items-center justify-center w-4 h-4 rounded-full border shrink-0"
                style={{
                  borderColor: isSelected ? P.navy : P.line,
                  backgroundColor: isSelected ? "#fff" : P.cream,
                }}
              >
                {isSelected && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: P.navy }} />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                               Main Component                               */
/* -------------------------------------------------------------------------- */
const Choose_package_mobile = () => (
  <div>
    <Layout content={<Choose_package_mobile_content />} activeIndex="puja" />
  </div>
);
export default Choose_package_mobile;

const Choose_package_mobile_content = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  // The route param is a "name-id" slug (see lib/slug.ts) — recover the real
  // Mongo id for every lookup/API call below. A bare legacy id still works.
  const pujaId = extractIdFromSlug(id);

  const [activeSection, setActiveSection] = useState<SectionKey>("about");

  // resolves against `newpoojas` first, then the legacy `poojas` collection
  const { data: detail, isLoading: isPoojaLoading } = useAnyPoojaDetailQuery(pujaId);
  const pooja = detail?.pooja;
  const source: "new" | "legacy" = detail?.source === "new" ? "new" : "legacy";

  // Legacy poojas reference their mandir and need a second fetch; new poojas
  // embed it in mandirDetails[], so the query stays disabled for them.
  const mandirIdRaw = pooja?.mandirLists?.[0]?.mandirId;
  const mandirId =
    source === "new"
      ? ""
      : typeof mandirIdRaw === "string"
      ? mandirIdRaw
      : mandirIdRaw?._id || "";
  const { data: mandir } = useMandirByIdQuery(mandirId);

  // lets you preview any theme colour without touching the database:
  //   /services/puja/<id>/select-package?themeColor=%23C1440E
  const themeOverride = useSearchParams()?.get("themeColor") || undefined;

  const PUJA = useMemo(
    () => buildViewModel(pooja, mandir, themeOverride, source),
    [pooja, mandir, themeOverride, source]
  );
  const P = PUJA.palette; // derived from pooja.poojaColor

  /* Matches the pitru puja page: even a single package stays unselected until
     tapped, so its price/persons/image are seen and confirmed rather than
     applied silently. */
  const [pickedPackageLabel, setPickedPackageLabel] = useState<string | null>(null);
  const selectedPackage = PUJA.packages.find((pkg) => pkg.label === pickedPackageLabel) ?? null;

  /* Display total only — the server recomputes this from the catalog on the
     booking page, exactly as verifyOrderAmount does. */
  const total = selectedPackage?.price ?? PUJA.basePrice;

  const sections: SectionKey[] = [
    "about",
    ...(PUJA.benefits.length ? (["benefits"] as const) : []),
    ...(PUJA.templeFacts.length ? (["mandir"] as const) : []),
    ...(PUJA.packages.length > 0 ? (["package"] as const) : []),
  ];

  const scrollToSection = (key: SectionKey) => {
    setActiveSection(key);
    document.getElementById(sectionDomId(key))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const revealPackages = useCallback(() => {
    setActiveSection("package");
    document
      .getElementById(sectionDomId("package"))
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /**
   * Like the pitru puja page: "Proceed" hands off to a dedicated details page
   * rather than revealing a form inline. Only the package's `label` needs to
   * travel — the booking page re-resolves the pooja/package from it via the
   * same query, so it is never trusting a price the URL happened to carry.
   */
  const goToBooking = () => {
    if (!PUJA.isBookable) return;
    if (PUJA.packages.length > 0 && !selectedPackage) return revealPackages();
    const params = selectedPackage ? `?packageLabel=${encodeURIComponent(selectedPackage.label)}` : "";
    router.push(`/services/puja/${pujaId}/book${params}`);
  };

  if (isPoojaLoading || !pooja) {
    return (
      <div
        className="grid min-h-screen place-items-center font-sans text-[14px]"
        style={{ color: PALETTE.inkSoft }}
      >
        Loading puja details…
      </div>
    );
  }

  return (
    <>
      <style>{PUJA_SHARED_STYLES}</style>

      <div className="min-h-screen bg-white font-sans" style={{ color: P.ink }}>
        <Hero PUJA={PUJA} />

        {/* Section tabs */}
        <div className="mt-4 border-y" style={{ borderColor: P.line }}>
          <div className="puja-tabs max-w-3xl mx-auto px-3 md:px-0 flex justify-between gap-2 md:gap-3 overflow-x-auto">
            {sections.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => scrollToSection(key)}
                className={`shrink-0 whitespace-nowrap py-2.5 text-[11.5px] min-[360px]:text-[12px] md:text-[14px] border-b-2 transition-colors ${
                  activeSection === key ? "font-semibold" : ""
                }`}
                style={{
                  color: activeSection === key ? P.ink : P.inkSoft,
                  borderColor: activeSection === key ? P.navy : "transparent",
                }}
              >
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* The tall bottom padding clears the fixed CTA bar so the last section
            stays reachable. */}
        <div
          className="max-w-3xl mx-auto px-3 md:px-0"
          style={{ paddingBottom: "calc(104px + env(safe-area-inset-bottom))" }}
        >
          <AboutProse PUJA={PUJA} />

          {PUJA.benefits.length > 0 && <Benefits PUJA={PUJA} />}

          {PUJA.templeFacts.length > 0 && <TempleFacts PUJA={PUJA} />}

          {PUJA.bannerImage && (
            <div className="mt-6">
              <SankalpBanner PUJA={PUJA} />
            </div>
          )}

          {PUJA.packages.length > 0 && (
            <PackageSection PUJA={PUJA} selected={selectedPackage} onSelect={setPickedPackageLabel} />
          )}
        </div>

        {/* Sticky CTA — advances to the details/payment page, same as the
            pitru puja landing page. Nothing is collected here. */}
        <div
          className="fixed bottom-0 inset-x-0 z-40 bg-white px-3 pt-2.5 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom))" }}
        >
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={goToBooking}
              disabled={!PUJA.isBookable}
              className="w-full min-h-[52px] flex items-center justify-between gap-2 min-[360px]:gap-3 rounded-xl px-3 min-[360px]:px-4 py-2 text-left text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: P.raw }}
            >
              {PUJA.packages.length > 0 && !selectedPackage ? (
                <span className="w-full text-center text-[15px] font-medium tracking-wide">
                  Select Package
                </span>
              ) : (
                <>
                  <span className="min-w-0 leading-tight">
                    <span className="flex items-baseline gap-1.5 min-[360px]:gap-2">
                      <span className="text-[16px] min-[360px]:text-[17px] font-medium whitespace-nowrap">
                        {money(total)}
                      </span>
                      {/* originalPrice strikes through discountPrice, and neither
                          is the basis of a package price — so it only belongs on
                          a pooja that prices off the document */}
                      {PUJA.strikePrice > 0 && PUJA.packages.length === 0 && (
                        <span className="text-[11px] min-[360px]:text-[12px] line-through opacity-70">
                          {money(PUJA.strikePrice)}
                        </span>
                      )}
                    </span>
                    <span className="block text-[12px] truncate">
                      {selectedPackage ? selectedPackage.label : "Start From"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] min-[360px]:text-[14px] font-medium tracking-wide">
                    {!PUJA.isBookable ? (PUJA.isExpired ? "Booking closed" : "Unavailable") : "Proceed"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
