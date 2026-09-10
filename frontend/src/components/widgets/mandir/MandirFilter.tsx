"use client";

import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CloseIcon from "@mui/icons-material/Close";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useActiveMandirsQuery } from "@/hooks/queries/useMandirQueries";
import { useAllPersonalizedPoojasQuery } from "@/hooks/queries/usePoojaQueries";
import { useQueryClient } from "@tanstack/react-query";
import { MANDIR_KEYS } from "@/lib/query-keys/mandir.keys";
import { fetchMandirById } from "@/lib/api/mandir.api";
import { buildDetailSlug } from "@/lib/slug";
import Fuse from "fuse.js";
import useMediaQuery from '@mui/material/useMediaQuery';

const Gods = [
  { name: "All", value: "", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/all-god.png" },
  { name: "Brahma Ji", value: "brahma", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/brahma.png" },
  { name: "Shiv Ji", value: "shiv", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/shiv.png" },
  { name: "Shri Ganesh", value: "ganesh", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/ganesh.png" },
  { name: "Maa Durga", value: "durga", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/durga.png" },
  { name: "Shri Vishnu", value: "vishnu", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/vishnu.png" },
  { name: "Maa Laxmi", value: "laxmi", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/laxmi.png" },
  { name: "Shri Krishna", value: "krishna", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/krishna.png" },
  { name: "Radha Rani", value: "radha", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/radha.png" },
  { name: "Shri Ram", value: "ram", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/ram.png" },
  { name: "Surya Dev", value: "surya", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/surya.png" },
  { name: "Shani Dev", value: "shani", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/shani.png" },
  { name: "Mangal Dev", value: "mangal", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/mangal.png" },
  { name: "Hanuman Ji", value: "hanuman", img: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/mandir-images/Gods/hanuman.png" },
];

type OptionType = { value: string; filter: string };

const safe = (v?: string) => v ?? "";

/** Values that mean "no state recorded" and must not appear as filter options. */
const PLACEHOLDER_STATES = new Set(["na", "n/a", "n.a.", "-", "--", "none", "null", "undefined", "not available"]);

const MandirFilter = () => {
  const nav = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useMediaQuery("(max-width:768px)");

  const { data: allMandirs = [], isLoading: loading, error: queryError } = useActiveMandirsQuery();
  const error = queryError ? "Failed to fetch data" : null;

  // Active personalized poojas — used to keep only mandirs that actually offer one
  const { data: personalizedPoojas = [], isLoading: poojasLoading } = useAllPersonalizedPoojasQuery();

  // Set of mandir ids that have at least one active personalized pooja
  const personalizedMandirIds = useMemo(() => {
    const ids = new Set<string>();
    (personalizedPoojas as any[]).forEach((p) => {
      (p?.mandirIds || []).forEach((id: string) => ids.add(String(id)));
    });
    return ids;
  }, [personalizedPoojas]);

  // Only show mandirs in which a personalized puja is available
  const mandirs = useMemo(
    () =>
      personalizedMandirIds.size === 0
        ? []
        : (allMandirs as any[]).filter((m) => personalizedMandirIds.has(String(m._id))),
    [allMandirs, personalizedMandirIds]
  );

  const [godFilter, setGodFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [templeFilter, setTempleFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);

  const inputRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLDivElement | null>(null);

  // Prefetch on hover   
  const prefetchMandirDetail = useCallback((id: string) => {
    const mandirId = String(id || "");
    if (!mandirId) return;
    queryClient.prefetchQuery({
      queryKey: MANDIR_KEYS.detail(mandirId),
      queryFn: () => fetchMandirById(mandirId),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  /**
   * Unique states for the dropdown.
   *
   * `.filter(Boolean)` alone is not enough: some mandir records carry the string
   * "N/A" in `state` (3 of them in production today) rather than an empty value,
   * so it survived as a real-looking option. Those temples are still listed —
   * they just no longer offer a meaningless thing to filter by.
   */
  const states = useMemo(() => {
    return Array.from(new Set(mandirs.map((t: any) => safe(t.state).trim())))
      .filter((s) => s && !PLACEHOLDER_STATES.has(s.toLowerCase()))
      .sort() as string[];
  }, [mandirs]);

  // Fuse for mandirs
  const fuse = useMemo(() => new Fuse(mandirs, {
    keys: ["nameEnglish", "nameHindi", "location"],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    ignoreLocation: true,
  }), [mandirs]);

  // Search options for suggestions
  const searchOptions: OptionType[] = useMemo(() => {
    return Array.from(new Set(mandirs.map((t: any) => safe(t.nameID)))).filter(Boolean)
      .map((nameID) => {
        const temple = mandirs.find((t: any) => t.nameID === nameID);
        return { value: safe(temple?.nameEnglish), filter: nameID };
      })
      .filter((o) => o.value) as OptionType[];
  }, [mandirs]);

  const fuseSug = useMemo(() => new Fuse(searchOptions, {
    keys: ["value"],
    threshold: 0.4,
    distance: 100,
    minMatchCharLength: 2,
    ignoreLocation: true,
  }), [searchOptions]);

  const suggestions: OptionType[] = useMemo(() => {
    const key = searchInput.toLowerCase();
    if (!key) return [];
    const fuseResults = fuseSug.search(key).map((r) => r.item as OptionType);
    return fuseResults.length ? fuseResults : searchOptions.filter((o) => o.value.toLowerCase().includes(key));
  }, [searchInput, searchOptions, fuseSug]);

  // Final filtered mandirs
  const filteredData = useMemo(() => {
    const godKey = godFilter.toLowerCase();
    const stateKey = stateFilter.toLowerCase();

    let base = mandirs;
    if (templeFilter) {
      // A suggestion click sets templeFilter to the temple's nameID, which
      // won't fuzzy-match against nameEnglish/nameHindi/location below — match
      // it directly first. Free-typed text falls through to the fuzzy search.
      const exactMatches = mandirs.filter((m: any) => m.nameID === templeFilter);
      if (exactMatches.length > 0) {
        base = exactMatches;
      } else {
        const res = fuse.search(templeFilter).map((r) => r.item);
        base = res.length > 0 ? res : [];
      }
    }

    return base.filter((m: any) => {
      const godOK = godKey
        ? Array.isArray(m.godName) && m.godName.some((g: string) => g.toLowerCase().includes(godKey) || godKey.includes(g.toLowerCase()))
        : true;
      const stateOK = stateKey ? safe(m.state).toLowerCase() === stateKey : true;
      return godOK && stateOK;
    });
  }, [mandirs, godFilter, stateFilter, templeFilter, fuse]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.contains(e.target as Node)) setShowSug(false);
      if (!stateRef.current?.contains(e.target as Node)) setStateOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleSelectSuggestion = (opt: OptionType) => {
    setSearchInput(opt.value);
    setTempleFilter(opt.filter);
    setShowSug(false);
  };

  const handleClearAll = () => {
    setGodFilter("");
    setStateFilter("");
    setTempleFilter("");
    setSearchInput("");
  };

  if (loading || poojasLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[30vh] gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Loading Mandirs…</span>
      </div>
    );
  }
  if (error) return <div className="p-6 text-red-600 text-center">{error}</div>;

  return (
    <div className={`${isMobile ? "px-3" : "px-[6%]"} pb-12`}>
      <style>{`
        .mf-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .mf-card:hover { transform: translateY(-5px); box-shadow: 0 18px 44px rgba(0,0,0,0.12); }
        .mf-card:hover .mf-cta { opacity: 1; transform: translateY(0); }
        .mf-cta { opacity: 0; transform: translateY(6px); transition: opacity 0.2s ease, transform 0.2s ease; }
        @media (max-width: 768px) { .mf-cta { opacity: 1 !important; transform: translateY(0) !important; } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes mf-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mf-card-appear { animation: mf-fade 0.28s ease both; }
      `}</style>

      {/* ── GOD FILTER STRIP ── */}
      <div className={`flex overflow-x-auto gap-2 ps-1 no-scrollbar ${isMobile ? "py-3" : "py-4"}`}>
        {Gods.map((g) => {
          const active = godFilter === g.value;
          return (
            <button
              key={g.value}
              onClick={() => setGodFilter(active ? "" : g.value)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl transition-all border
                ${active
                  ? "bg-orange-50 border-orange-400 ring-2 ring-orange-300 shadow scale-105"
                  : "bg-white border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm"
                }`}
              style={{
                padding: isMobile ? "6px 8px" : "8px 12px",
                minWidth: isMobile ? 52 : 66,
              }}
            >
              <img loading="lazy" 
                src={g.img}
                alt={g.name}
                style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, objectFit: "contain" }}
               />
              <span style={{
                fontSize: isMobile ? 9 : 10,
                fontWeight: 500,
                whiteSpace: "nowrap",
                color: active ? "#ea580c" : "#4b5563",
              }}>
                {g.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SEARCH + STATE + CLEAR ── */}
      <div className={`flex items-center gap-2 mb-5 ${isMobile ? "flex-col" : "flex-row"}`}>

        {/* Search */}
        <div className="relative flex-1 w-full" ref={inputRef}>
          <SearchIcon fontSize="small" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ fontSize: 17 }} />
          <input
            type="text"
            placeholder='Search "Vaishno Devi", "Kedarnath"…'
            value={searchInput}
            onFocus={() => setShowSug(true)}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setTempleFilter(e.target.value);
              if (!e.target.value) setTempleFilter("");
            }}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-full text-sm placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-300 shadow-sm"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setTempleFilter(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              <CloseIcon style={{ fontSize: 15 }} />
            </button>
          )}
          {showSug && suggestions.length > 0 && (
            <ul className="absolute z-30 top-[calc(100%+4px)] left-0 right-0 bg-white border border-gray-100 rounded-xl max-h-56 overflow-y-auto shadow-xl text-sm divide-y divide-gray-50">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-4 py-2.5 hover:bg-orange-50 cursor-pointer text-gray-700 hover:text-orange-700 transition"
                >
                  {s.value}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* State dropdown */}
        <div className={`relative flex-shrink-0 ${isMobile ? "w-full" : "w-48"}`} ref={stateRef}>
          <button
            onClick={() => setStateOpen(!stateOpen)}
            className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-full text-sm shadow-sm transition-all
              ${stateOpen ? "border-orange-400 ring-2 ring-orange-200" : "border-gray-200 hover:border-orange-200"}`}
          >
            <span className={`truncate font-medium ${stateFilter ? "text-gray-800" : "text-gray-400"}`}>
              {stateFilter || "All States"}
            </span>
            <div className="flex items-center gap-1 ml-2">
              {stateFilter && (
                <span
                  onClick={(e) => { e.stopPropagation(); setStateFilter(""); setStateOpen(false); }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <CloseIcon style={{ fontSize: 14 }} />
                </span>
              )}
              <span style={{ fontSize: 9, color: "#9ca3af", transform: stateOpen ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
            </div>
          </button>
          {stateOpen && (
            <div className="absolute z-30 top-[calc(100%+6px)] left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl max-h-56 overflow-y-auto">
              {["", ...states].map((s) => (
                <button
                  key={s || "__all"}
                  onClick={() => { setStateFilter(s); setStateOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition hover:bg-orange-50 hover:text-orange-700
                    ${stateFilter === s ? "bg-orange-50 text-orange-700 font-semibold" : "text-gray-700"}`}
                >
                  {s || "All States"}
                </button>
              ))}
            </div>
          )}
        </div>

      
       
      </div>

      {/* ── RESULT COUNT ── */}
      <p className="text-xs text-gray-400 mb-4">
        <span className="font-semibold text-gray-700">{filteredData.length}</span> mandir{filteredData.length !== 1 ? "s" : ""} found
      </p>

      {/* ── TEMPLE GRID ── */}
      {filteredData.length > 0 ? (
        <div className={`grid gap-4 ${isMobile ? "grid-cols-2" : "grid-cols-3 lg:grid-cols-4"}`}>
          {filteredData.map((m: any, idx: number) => (
            <div
              key={m._id}
              className="mf-card mf-card-appear bg-white rounded-2xl overflow-hidden cursor-pointer border border-gray-100 shadow-sm"
              style={{ animationDelay: `${Math.min(idx * 25, 280)}ms` }}
              onMouseEnter={() => prefetchMandirDetail(m._id)}
              onFocus={() => prefetchMandirDetail(m._id)}
              onTouchStart={() => prefetchMandirDetail(m._id)}
              onClick={() => nav.push(`/mandir/${buildDetailSlug(m.nameEnglish, m._id)}`)}
            >
              {/* Image */}
              <div
                className={`relative ${isMobile ? "w-full aspect-[16/9]" : "h-44"} overflow-hidden`}
              >
                <img
                  src={safe(m.mandirSectionImage)}
                  alt={safe(m.nameEnglish)}
                  loading="lazy"
                  className={isMobile ? "absolute inset-0 w-full h-full object-contain" : "absolute inset-0 w-full h-full object-cover"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                {m.nameHindi && (
                  <span className="absolute bottom-2 left-3 text-white/75 text-[10px] font-medium leading-none z-10">
                    {safe(m.nameHindi)}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className={isMobile ? "p-2.5" : "p-3.5"}>
                <h3 className={`font-semibold text-gray-900 truncate leading-tight ${isMobile ? "text-[11px]" : "text-[13px]"}`}>
                  {safe(m.nameEnglish)}
                </h3>
                <p className={`flex items-center gap-0.5 text-gray-400 mt-0.5 truncate ${isMobile ? "text-[9px]" : "text-[11px]"}`}>
                  <LocationOnIcon style={{ fontSize: isMobile ? 10 : 12, color: "#fb923c", flexShrink: 0 }} />
                  {safe(m.location)}
                </p>

                <div className="mt-2.5 mf-cta">
                  <div className={`flex items-center justify-between bg-[#E35600] text-white rounded-xl px-3 font-semibold hover:bg-orange-700 transition ${isMobile ? "py-1.5 text-[9px]" : "py-2 text-[11px]"}`}>
                    <span>Book Puja</span>
                    <ArrowForwardIcon style={{ fontSize: isMobile ? 11 : 13 }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div style={{ fontSize: "3.5rem" }} className="mb-4">🛕</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Temples Found</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-5">
            Try adjusting your filters or searching a different name.
          </p>
          <button
            onClick={handleClearAll}
            className="px-5 py-2.5 bg-[#E35600] text-white text-sm font-semibold rounded-full hover:bg-orange-700 transition"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default MandirFilter;
