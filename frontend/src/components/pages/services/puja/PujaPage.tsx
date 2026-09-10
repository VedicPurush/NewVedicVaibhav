"use client";

import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { useEffect, useState } from "react";
import { Pagination, message, Spin } from "antd";
import { useSearchParams } from "next/navigation";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";
import "./PujaPage.css";
import { useCombinedPoojasQuery } from "@/hooks/useAllPoojas";
import { captureVvUtm } from "@/lib/utm";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PujaListHero, { type PujaSortKey } from "./list/PujaListHero";
import PujaGridCard from "./list/PujaGridCard";
import PujaListCard from "./list/PujaListCard";
import { getPujaBadge } from "./list/badgePresets";

const PujaPage = () => {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  useEffect(() => {
    captureVvUtm();
  }, []);

  return (
    <div>
      <Layout content={<PujaContent />} activeIndex="puja" />
    </div>
  );
};

export default PujaPage;

// Types
type Mandir = {
  _id: string;
  nameEnglish: string;
};

type PoojaMandirList = {
  mandirId: string | { _id?: string };
  originalPrice: number;
  discountPrice: number;
  poojaMandirDates: string[];
  poojaMandirBenefits: string;
  _id: string;
};

type Puja = {
  _id: string;
  poojaID: string;
  title: string;
  titleHindi?: string;
  poojaGod: string;
  moolmantra: string;
  mandirLists: PoojaMandirList[];
  poojaCardBenefit: string;
  poojaDescription: string;
  poojaCardImage: string;
  images: string[];
  isActive: boolean;
  isExclusive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  earliestDate?: string; // <- important!
  latestDate?: string; // computed from mandirLists[].poojaMandirDates (latest upcoming date)
  // --- set only for poojas from the new `newpoojas` collection ---
  source?: "new" | "legacy";
  mandirDetails?: any[];
  originalPrice?: number;
  discountPrice?: number;
  __mandirName?: string; // temple name, already embedded on the new shape
};

const stripHtml = (html: string): string => {
  if (typeof document === "undefined") return (html || "").replace(/<[^>]*>/g, "");
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// ---------------- DATE HELPERS (pick latest from array) ----------------
const parseFlexibleDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return null;
    const m1 = s.match(/^([0-3]?\d)-([0-1]?\d)-(\d{4})$/);
    if (m1) {
      const dd = Number(m1[1]);
      const mm = Number(m1[2]);
      const yyyy = Number(m1[3]);
      const d = new Date(yyyy, mm - 1, dd, 0, 0, 0);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const pickLatestDateFromArray = (dates: any[]): Date | null => {
  const parsed = (dates || []).map(parseFlexibleDate).filter(Boolean) as Date[];
  if (parsed.length === 0) return null;
  parsed.sort((a, b) => b.getTime() - a.getTime());
  return parsed[0];
};

const computeLatestPujaDate = (puja: any): string | undefined => {
  const allDates: any[] = [];
  (puja?.mandirLists || []).forEach((m: any) => {
    const d = m?.poojaMandirDates;
    if (Array.isArray(d)) allDates.push(...d);
    else if (d) allDates.push(d);
  });
  const latest = pickLatestDateFromArray(allDates);
  return latest ? latest.toISOString() : undefined;
};

const formatDateLabel = (value: any): string => {
  const dates = Array.isArray(value) ? value : [value];
  const latest = pickLatestDateFromArray(dates);
  if (!latest) return "Date TBA";
  return latest.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
// ---------------------------------------------------------------------
// ----- NEW HELPERS FOR FILTER -----

// Returns a Date object for puja's latestDate at END OF DAY (23:59:59 local time)
// so the puja remains visible for the whole date and becomes inactive the next day.
const getPujaEarliestDateTime = (puja: Puja) => {
  // We want the *latest* upcoming date (not the oldest) for visibility + display.
  // Fallback to earliestDate only if latestDate is not available.
  const base = puja.latestDate || puja.earliestDate;
  if (!base) return null;

  const datePart = String(base).split("T")[0];
  // Keep the puja visible for the whole date (until end of day)
  const dateTimeString = `${datePart}T23:59:59`;
  const d = new Date(dateTimeString);
  return isNaN(d.getTime()) ? null : d;
};

// Is this puja's 6PM (earliestDate) in the future?
const isPujaInFuture = (puja: Puja) => {
  // New-collection poojas schedule on the document itself. Those without any
  // dates have nothing to expire against, so they stay listed while isActive —
  // without this they would be dropped here and never reach the grid.
  if (puja.source === "new" && !puja.latestDate) return true;
  const dateTime = getPujaEarliestDateTime(puja);
  if (!dateTime) return false;
  return dateTime > new Date();
};

const getMandirId = (mandirId: PoojaMandirList["mandirId"]) => {
  if (typeof mandirId === "string") return mandirId;
  return mandirId?._id || "";
};

// Prefer the first mandir's dates for display; let the card pick latest if array
const getDisplayDate = (puja: Puja) => {
  const dates = puja.mandirLists?.[0]?.poojaMandirDates;
  if (!dates || (Array.isArray(dates) && dates.length === 0)) {
    return "Unknown Date";
  }
  return dates;
};

// ----------------------------------

const EmptyPujaState = ({ tab }: { tab: string }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full py-16 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center max-w-md mx-auto text-center bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0], y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          className="w-24 h-24 mb-6 bg-gradient-to-br from-orange-50 to-red-50 rounded-full flex items-center justify-center shadow-inner"
        >
          <span className="text-5xl drop-shadow-md">🪔</span>
        </motion.div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-2 tracking-tight">
          No live {tab === "All" ? "Pujas" : tab} right now
        </h3>
        <p className="text-[14px] text-slate-500 leading-relaxed font-medium max-w-xs mx-auto mb-4">
          We currently don't have any active {tab === "All" ? "pujas" : tab.toLowerCase()} scheduled in this category. Please check back soon!
        </p>
      </motion.div>
    </div>
  );
};

const PAGE_SIZE = 12;
const MOBILE_PREVIEW = 4;

const PujaContent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [sortBy, setSortBy] = useState<PujaSortKey>("upcoming");
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileShowAll, setMobileShowAll] = useState(false);
  const searchParams = useSearchParams();

  const {
    data: fetchedPoojas = [],
    isLoading: isPoojasLoading,
    isError: isPoojasError,
    isFetching: isPoojasFetching,
  } = useCombinedPoojasQuery(); // legacy `poojas` + new `newpoojas`

  useEffect(() => {
    const tab = searchParams?.get("tab");

    if (tab && ["Mahakumbh", "Rudrabhishek", "Puja"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Deep links (e.g. ?tab=Rudrabhishek) still pre-filter the list even though the
  // pill selector UI was removed to match the new design — jump back to page 1
  // whenever the effective result set changes under the user.
  useEffect(() => {
    setCurrentPage(1);
    setMobileShowAll(false);
  }, [searchTerm, activeTab, sortBy]);

  const getLowestDiscountPrice = (mandirLists: PoojaMandirList[]): number => {
    // Math.min() of an empty list is Infinity — guard so a pooja with no
    // mandir entries shows 0 rather than "₹Infinity".
    if (!mandirLists?.length) return 0;
    return Math.min(...mandirLists.map((mandir) => mandir.discountPrice));
  };

  // Memoized pujaData, mandirIds, mandir queries, mandirMap
  const pujaData: Puja[] = (fetchedPoojas || []).map((puja: any) => {
    // New-collection poojas embed the temple and hold one price pair on the
    // document. Project that into the mandirLists shape the rest of this
    // page reads, so cards, prices and filters keep working unchanged.
    if (puja.source === "new") {
      const md = puja.mandirDetails?.[0];
      return {
        ...puja,
        mandirLists: [
          {
            mandirId: "",
            discountPrice: puja.discountPrice ?? puja.originalPrice ?? 0,
            originalPrice: puja.originalPrice ?? 0,
            // poojaDates live on the document, not per-mandir
            poojaMandirDates: puja.poojaDates || [],
          },
        ],
        __mandirName: md?.name || "",
        latestDate: pickLatestDateFromArray(puja.poojaDates || [])?.toISOString(),
        poojaCardBenefit: stripHtml(puja.poojaCardBenefit),
        poojaDescription: stripHtml(puja.poojaDescription),
      };
    }

    return {
      ...puja,
      // compute latest date from mandirLists[].poojaMandirDates so UI never picks the oldest
      latestDate: computeLatestPujaDate(puja),
      poojaCardBenefit: stripHtml(puja.poojaCardBenefit),
      poojaDescription: stripHtml(puja.poojaDescription),
    };
  });

  // One shared request for every active mandir (cached ~30min, reused across
  // every page that needs a mandir name) instead of a separate round trip per
  // unique mandir id — that fan-out was firing dozens of parallel requests
  // and was the main cause of this page loading slowly.
  const { data: activeMandirs = [] } = useActiveMandirsQuery();

  const mandirMap = (() => {
    const map: { [key: string]: Mandir } = {};
    activeMandirs.forEach((m: any) => {
      if (m?._id) map[String(m._id)] = m;
    });
    return map;
  })();

  if (isPoojasLoading && pujaData.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isPoojasError) {
    message.error("Failed to load Puja data. Please try again later.");
    return (
      <div style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
        Failed to load Puja data. Please try again later.
      </div>
    );
  }

  // ---------- Only pujas with future earliestDate (at 6PM), matching search + optional deep-linked tab ----------
  // poojaID is a free-form string in the DB, so its spelling can vary
  // (e.g. "rudraabhishek", "rudrabhishekam"). Match on the distinctive
  // normalized prefix of each category instead of strict equality.
  const normalizeId = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const TAB_MATCH_KEY: Record<string, string> = {
    Puja: "puja",
    Rudrabhishek: "rudra",
    Mahakumbh: "mahakumbh",
  };
  const filteredPujaData = pujaData
    .filter(isPujaInFuture)
    .filter(({ title, poojaID }) => {
      const matchesSearch = title
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (activeTab === "All") return matchesSearch;
      const key = TAB_MATCH_KEY[activeTab] ?? normalizeId(activeTab);
      return matchesSearch && normalizeId(poojaID).startsWith(key);
    });

  const sortedPujaData = [...filteredPujaData];
  switch (sortBy) {
    case "price-asc":
      sortedPujaData.sort(
        (a, b) => getLowestDiscountPrice(a.mandirLists) - getLowestDiscountPrice(b.mandirLists),
      );
      break;
    case "price-desc":
      sortedPujaData.sort(
        (a, b) => getLowestDiscountPrice(b.mandirLists) - getLowestDiscountPrice(a.mandirLists),
      );
      break;
    case "newest":
      sortedPujaData.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "popularity":
      sortedPujaData.sort(
        (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.isExclusive) - Number(a.isExclusive),
      );
      break;
    case "upcoming":
    default:
      sortedPujaData.sort((a, b) => {
        const da = a.latestDate ? new Date(a.latestDate).getTime() : Infinity;
        const db = b.latestDate ? new Date(b.latestDate).getTime() : Infinity;
        return da - db;
      });
  }

  const totalPages = Math.ceil(sortedPujaData.length / PAGE_SIZE);
  const desktopPageItems = sortedPujaData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const mobileItems = mobileShowAll ? sortedPujaData : sortedPujaData.slice(0, MOBILE_PREVIEW);

  const rangeStart = sortedPujaData.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, sortedPujaData.length);

  return (
    <div>
      <PujaListHero
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={setSortBy}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        total={sortedPujaData.length}
      />

      {!isPoojasLoading && isPoojasFetching && (
        <div className="max-w-6xl mx-auto px-4 -mt-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur border border-orange-200 text-orange-800 text-xs font-semibold shadow-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            Updating…
          </div>
        </div>
      )}

      {/* ── Mobile list ── */}
      <div className="md:hidden px-4 py-6">
        {sortedPujaData.length === 0 ? (
          <EmptyPujaState tab={activeTab} />
        ) : (
          <>
            <div className="flex flex-col gap-3 min-w-0">
              {mobileItems.map((puja) => {
                const mandirId = getMandirId(puja.mandirLists[0]?.mandirId);
                const mandirName =
                  puja.__mandirName || mandirMap[mandirId]?.nameEnglish || "Unknown Mandir";
                const mandirDate = getDisplayDate(puja);
                return (
                  <PujaListCard
                    key={puja._id}
                    id={puja._id}
                    imgSrc={puja.poojaCardImage}
                    title={puja.title}
                    location={mandirName}
                    dateLabel={formatDateLabel(mandirDate)}
                    price={getLowestDiscountPrice(puja.mandirLists)}
                    featured={puja.isFeatured}
                  />
                );
              })}
            </div>
            {!mobileShowAll && sortedPujaData.length > MOBILE_PREVIEW && (
              <button
                type="button"
                onClick={() => setMobileShowAll(true)}
                className="mt-5 mx-auto flex items-center gap-1 rounded-full border border-orange-300 text-orange-600 text-[13px] font-semibold px-5 py-2.5"
              >
                View All Upcoming Poojas
                <ChevronRightRoundedIcon style={{ fontSize: 16 }} />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Desktop grid ── */}
      <div className="hidden md:block w-full max-w-7xl mx-auto px-4 py-2">
        {sortedPujaData.length === 0 ? (
          <EmptyPujaState tab={activeTab} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
              {desktopPageItems.map((puja, idx) => {
                const mandirId = getMandirId(puja.mandirLists[0]?.mandirId);
                const mandirName =
                  puja.__mandirName || mandirMap[mandirId]?.nameEnglish || "Unknown Mandir";
                const mandirDate = getDisplayDate(puja);
                return (
                  <PujaGridCard
                    key={puja._id}
                    id={puja._id}
                    imgSrc={puja.poojaCardImage}
                    title={puja.title}
                    location={mandirName}
                    dateLabel={formatDateLabel(mandirDate)}
                    description={puja.poojaCardBenefit || puja.poojaDescription}
                    price={getLowestDiscountPrice(puja.mandirLists)}
                    badge={getPujaBadge(idx, puja.isFeatured, puja.isExclusive)}
                  />
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  className="puja-pagination"
                  current={currentPage}
                  total={sortedPujaData.length}
                  pageSize={PAGE_SIZE}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
