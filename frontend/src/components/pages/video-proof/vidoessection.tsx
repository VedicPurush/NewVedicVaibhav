"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/layout/Layout";
import { parseVideoLink, type ParsedVideo } from "@/lib/videoLinkParser";
import { api } from "@/lib/api";

const PAGE_LIMIT = 10;

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoProofDoc {
  _id: string; title: string; category: string; temple?: string;
  videoLink: string; uploadDate?: string; description?: string; isFeatured?: boolean;
}
interface VideoItem extends ParsedVideo {
  _id: string; category: string; temple?: string;
  uploadDate?: string; description?: string; isFeatured?: boolean;
}

// ─── Skeleton card (adapts to mobile overlay style) ──────────────────────────
const SkeletonCard = ({ mobile = false }: { mobile?: boolean }) => (
  mobile ? (
    <div className="rounded-2xl overflow-hidden animate-pulse bg-slate-200" style={{ aspectRatio: "3/4" }}>
      <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
    </div>
  ) : (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm animate-pulse">
      <div className="aspect-video bg-slate-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-200 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
      </div>
    </div>
  )
);

// ─── Mobile card — portrait overlay style (like Reels/TikTok) ────────────────
const MobileVideoCard = ({ item, onClick }: { item: VideoItem; onClick: (item: VideoItem) => void }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(item)}
      className="relative rounded-2xl overflow-hidden cursor-pointer shadow-md active:scale-[0.97] transition-transform"
      style={{ aspectRatio: "3/4" }}
    >
      {/* Full-bleed image */}
      {item.thumbUrl && !imgError ? (
        <img loading="lazy" src={item.thumbUrl} alt={item.title}
          onError={() => setImgError(true)}
          className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-800 flex items-center justify-center">
          <span className="text-5xl opacity-50">🎬</span>
        </div>
      )}

      {/* Strong gradient overlay — darker at bottom for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
        {item.isFeatured && (
          <span className="text-[9px] font-black uppercase bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-lg">
            ★
          </span>
        )}
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg ${item.type === "drive" ? "bg-blue-500 text-white" : "bg-red-500 text-white"
          }`}>
          {item.type === "drive" ? "Drive" : "YT"}
        </span>
      </div>

      {/* Play button — centre */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm border border-white/40
                        flex items-center justify-center shadow-2xl">
          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Bottom text overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="font-bold text-white text-xs leading-snug line-clamp-2 mb-1.5">
          {item.title}
        </p>
        {item.temple && (
          <p className="text-white/70 text-[10px] flex items-center gap-1 leading-tight">
            <span>📍</span>
            <span className="truncate">{item.temple}</span>
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Desktop card — standard landscape style ──────────────────────────────────
const DesktopVideoCard = ({ item, onClick }: { item: VideoItem; onClick: (item: VideoItem) => void }) => {
  const [imgError, setImgError] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      transition={{ duration: 0.25 }}
      onClick={() => onClick(item)}
      className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer"
    >
      <div className="relative aspect-video bg-slate-100 overflow-hidden">
        {item.thumbUrl && !imgError ? (
          <img loading="lazy" src={item.thumbUrl} alt={item.title} onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100">
            <span className="text-5xl opacity-60">🎬</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:bg-white/30 transition-all duration-300 shadow-xl">
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {item.isFeatured && (
            <span className="text-[9px] font-black uppercase tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded-full shadow">★ Featured</span>
          )}
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow ${item.type === "drive" ? "bg-blue-600 text-white" : "bg-red-600 text-white"}`}>
            {item.type === "drive" ? "Drive" : "YouTube"}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors mb-2">{item.title}</h3>
        <div className="flex flex-col gap-1">
          {item.temple && (
            <p className="text-slate-500 text-xs flex items-center gap-1.5">
              <svg className="w-3 h-3 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{item.temple}</span>
            </p>
          )}
          {item.uploadDate && (
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <svg className="w-3 h-3 text-orange-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(item.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Video modal ──────────────────────────────────────────────────────────────
const VideoModal = ({ item, onClose }: { item: VideoItem; onClose: () => void }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Google Drive's iframe tap-to-show-controls dark overlay is a known mobile
  // browser limitation — we can't suppress it from outside the iframe. Instead,
  // on mobile we show the thumbnail and open the video natively in Google Drive.
  const driveFileId = item.type === "drive"
    ? item.embedUrl.match(/\/file\/d\/([^/]+)\//)?.[1] ?? null
    : null;
  const useMobileDriveFallback = isMobile && item.type === "drive";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "95dvh" }}
      >
        {/* ── Video area ─────────────────────────────────────────────────────── */}
        <div className="relative w-full bg-black" style={{ paddingBottom: "56.25%" }}>
          {useMobileDriveFallback ? (
            /* Mobile + Google Drive: thumbnail card — tapping opens native GDrive player */
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              {item.thumbUrl ? (
                <img src={item.thumbUrl} alt={item.title}
                  className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-orange-900 to-amber-800" />
              )}
              <div className="absolute inset-0 bg-black/45" />
              <a
                href={driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : item.embedUrl}
                target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="relative z-10 flex items-center gap-2.5 bg-white text-slate-900 px-5 py-3 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform"
              >
                <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Video
              </a>
              <p className="absolute bottom-3 left-0 right-0 text-center text-white/60 text-[10px]">
                Opens in Google Drive
              </p>
            </div>
          ) : (
            /* Desktop or YouTube: full inline iframe */
            <iframe src={item.embedUrl} className="absolute inset-0 w-full h-full"
              allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen title={item.title} />
          )}
        </div>

        {/* ── Meta + close ───────────────────────────────────────────────────── */}
        <div className="p-4 sm:p-5 overflow-y-auto" style={{ maxHeight: "40dvh" }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h2 className="font-black text-slate-900 text-base sm:text-lg leading-snug">{item.title}</h2>
            <button onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-1">
            {item.temple && (
              <span className="text-slate-600 text-xs flex items-center gap-1">
                <span className="text-orange-500">📍</span> {item.temple}
              </span>
            )}
            {item.uploadDate && (
              <span className="text-slate-400 text-xs flex items-center gap-1">
                📅 {new Date(item.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-center ${item.type === "drive" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
              }`}>
              {item.type === "drive" ? "Google Drive" : "YouTube"}
            </span>
          </div>
          {item.description && (
            <p className="mt-3 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              {item.description}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Main content ─────────────────────────────────────────────────────────────
const VideosSectionContent = () => {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<VideoItem | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const fetchingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (pageNum: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (pageNum === 1) setIsInitial(true); else setIsLoadingMore(true);
    try {
      const res = await api.get(`/video-proofs/get-active`, { params: { page: pageNum, limit: PAGE_LIMIT } });
      const docs: VideoProofDoc[] = res.data?.data || [];
      const parsed: VideoItem[] = docs.map(d => ({
        _id: d._id, category: d.category, temple: d.temple,
        uploadDate: d.uploadDate, description: d.description, isFeatured: d.isFeatured,
        ...parseVideoLink(d.videoLink, d.title),
      }));
      setItems(prev => pageNum === 1 ? parsed : [...prev, ...parsed]);
      setHasMore(res.data?.pagination?.hasMore ?? false);
      setTotal(res.data?.pagination?.total ?? parsed.length);
    } catch (e) { console.error(e); }
    finally {
      setIsInitial(false); setIsLoadingMore(false); fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { fetchPage(1); }, [fetchPage]);
  useEffect(() => { if (page > 1) fetchPage(page); }, [page, fetchPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !fetchingRef.current) setPage(p => p + 1);
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, items.length]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
    return ["All", ...cats];
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (activeCategory !== "All") list = list.filter(i => i.category === activeCategory);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(t) || (i.temple || "").toLowerCase().includes(t));
    }
    return list;
  }, [items, activeCategory, search]);

  return (
    <div className="min-h-screen">

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative max-w-4xl mx-auto px-4 py-8 sm:py-20 text-center">
          {/* Sanskritic label */}
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-orange-500 mb-2 sm:mb-3">
            ॥ सत्य प्रमाण ॥
          </motion.p>

          {/* Title */}
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}
            className="text-2xl sm:text-5xl font-black text-slate-900 leading-tight mb-2 sm:mb-4">
            Proof of Every{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Prayer</span>
          </motion.h1>

          {/* Subtitle — hidden on very small screens to save vertical space */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.13 }}
            className="hidden sm:block text-slate-500 text-lg max-w-xl mx-auto leading-relaxed mb-8">
            Every offering performed by Vedic Vaibhav is real, live &amp; delivered with devotion.
          </motion.p>

          {/* Stats row — compact on mobile */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
            className="flex justify-center gap-6 sm:gap-10 mb-5 sm:mb-8 mt-2 sm:mt-0">
            {[
              { label: "Campaigns", value: `${total || "–"}` },
              { label: "Live Proof", value: "100%" },
              { label: "Temples", value: "50+" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-lg sm:text-2xl font-black text-slate-900">{s.value}</div>
                <div className="text-[10px] sm:text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="relative max-w-sm sm:max-w-md mx-auto">
            <svg className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search campaigns or temples…"
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent shadow-sm" />
          </motion.div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-8">

        {/* Category pills */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4 sm:mb-6">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${activeCategory === cat
                  ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-orange-700"
                  }`}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ─ MOBILE grid ─ portrait overlay cards, 2 columns */}
        {/* ─ DESKTOP grid ─ standard landscape cards, 3-4 columns */}
        {isInitialLoading ? (
          <>
            {/* Mobile skeleton */}
            <div className="grid grid-cols-2 gap-2.5 sm:hidden">
              {Array.from({ length: PAGE_LIMIT }).map((_, i) => <SkeletonCard key={i} mobile />)}
            </div>
            {/* Desktop skeleton */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: PAGE_LIMIT }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-orange-50 border-2 border-dashed border-orange-200 flex items-center justify-center text-4xl">🎥</div>
            <p className="font-bold text-slate-700 text-lg">No videos found</p>
            <p className="text-slate-400 text-sm">Try a different search or category.</p>
          </div>
        ) : (
          <>
            {/* Mobile portrait grid */}
            <div className="grid grid-cols-2 gap-2.5 sm:hidden">
              <AnimatePresence>
                {filtered.map(item => <MobileVideoCard key={item._id} item={item} onClick={setSelected} />)}
              </AnimatePresence>
            </div>

            {/* Desktop landscape grid */}
            <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {filtered.map(item => <DesktopVideoCard key={item._id} item={item} onClick={setSelected} />)}
              </AnimatePresence>
            </div>

            {/* Load-more skeleton */}
            {isLoadingMore && (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:hidden mt-3">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} mobile />)}
                </div>
                <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              </>
            )}

            {/* Sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-10" />}
            {!hasMore && items.length > 0 && (
              <p className="text-center text-slate-400 text-xs mt-8 mb-4">✦ All {total} videos loaded ✦</p>
            )}
          </>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && <VideoModal item={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ─── Page wrapper ─────────────────────────────────────────────────────────────
const VideosSection = () => (
  <Layout content={<VideosSectionContent />} activeIndex="home" />
);

export default VideosSection;
