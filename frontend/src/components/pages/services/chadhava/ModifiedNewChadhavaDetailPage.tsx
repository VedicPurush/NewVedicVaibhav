"use client";

import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import Share from '@mui/icons-material/Share';
import Lock from '@mui/icons-material/Lock';
import Close from '@mui/icons-material/Close';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import VerifiedIcon from "@mui/icons-material/Verified";
import React, { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";

import Layout from "@/components/layout/Layout";
import NewChadhavaContent from "./NewChadhavaContent";
import Loadinggif from "@/components/shared/LoadingGif";
import { useNewChadhavaDetailQuery } from "@/hooks/queries/useNewChadhavaDetailQuery";
import { useMandirDetailQuery } from "@/hooks/queries/useMandirQueries";
import { gtag } from "@/lib/gtag";
import { useMoney, shipsPrasad, toInr } from "@/lib/currency";
import { captureVvUtm } from "@/lib/utm";
import { extractIdFromSlug } from "@/lib/slug";
import { useMusic } from "@/components/widgets/music/MusicContext";
import ReviewPuja from "@/components/widgets/puja/ReviewPuja";

// --- Meta Pixel safe tracker (queues until fbq is ready) ---
const isFbq = (fn: unknown): fn is (...args: any[]) => void =>
    typeof fn === 'function';

const fbqTrack = (event: string, params?: Record<string, any>) => {
    if (typeof window === 'undefined') return;
    const w = window as any;

    // If fbq is available, fire immediately
    const fbq = w.fbq;
    if (isFbq(fbq)) {
        try {
            fbq('track', event, params || {});
        } catch (e) {
            console.warn('fbq track failed', e);
        }
        return;
    }

    // Otherwise, queue and start a short poll to flush when ready
    w._fbqQueue = w._fbqQueue || [];
    w._fbqQueue.push({ event, params });

    if (!w._fbqInterval) {
        w._fbqInterval = window.setInterval(() => {
            const readyFbq = w.fbq;
            if (isFbq(readyFbq)) {
                const q: Array<{ event: string; params?: Record<string, any> }> = w._fbqQueue || [];
                q.forEach((e) => {
                    try {
                        readyFbq('track', e.event, e.params || {});
                    } catch (err) {
                        console.warn('fbq queued track failed', err);
                    }
                });
                w._fbqQueue = [];
                window.clearInterval(w._fbqInterval);
                w._fbqInterval = 0;
            }
        }, 400);
    }
};

type Banner = {
    id: string;
    image: string;
    title: string;
    subtitle: string;
};

type BenefitTag = { id: string; text: string };

type GiftTier = {
    id: string;
    title: string;
    subtitle: string;
    minAmount: number;
    image: string;
};

type SingleItem = {
    id: string;
    name: string;
    price: number;
    desc: string;
    image: string;
};

type Combo = {
    id: string;
    title: string;
    items: SingleItem[];
    mrp: number;
    price: number;
    image: string;
    badgeText?: string;
    desc?: string;
};

const parseQuillDescription = (raw: string | undefined): string => {
    if (!raw) return "";
    try {
        const parsed = JSON.parse(raw);
        if (parsed?.ops && Array.isArray(parsed.ops)) {
            return parsed.ops
                .map((op: any) => (typeof op.insert === "string" ? op.insert : ""))
                .join("")
                .replace(/\r\n/g, "\n")
                .trim();
        }
    } catch {
        // not JSON — strip HTML tags
    }
    return raw
        .replace(/<\/p>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

const formatINR = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);

const formatChadhavaDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const weekday = date.toLocaleString('default', { weekday: 'long' });

    return `${day} ${month} ${year} , ${weekday}`;
};


const CountdownTimer = ({ targetDate }: { targetDate: Date }) => {
    const [timeLeft, setTimeLeft] = useState<{
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                clearInterval(interval);
                return;
            }

            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor(
                    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                ),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    const pad = (n: number) => String(n).padStart(2, "0");
    const units = [
        { n: timeLeft.days, l: "Days" },
        { n: timeLeft.hours, l: "Hrs" },
        { n: timeLeft.minutes, l: "Mins" },
        { n: timeLeft.seconds, l: "Sec" },
    ];
    return (
        <div className="flex items-center justify-center bg-gradient-to-r from-[#8C1519] via-[#B21E24] to-[#EC7A12] py-1.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            {units.map((u, i) => (
                <div
                    key={u.l}
                    className={`relative flex flex-col items-center px-3 ${i > 0 ? "before:absolute before:left-0 before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-white/30" : ""}`}
                >
                    <span className="text-[0.92rem] font-extrabold leading-none tracking-[0.4px] tabular-nums notranslate">{pad(u.n)}</span>
                    <span className="mt-0.5 text-[0.5rem] font-semibold uppercase tracking-[1.2px] opacity-80">{u.l}</span>
                </div>
            ))}
        </div>
    );
};

const getMandirImageUrl = (mandir: any) => {
    const img0 = mandir?.images?.[0];

    // 1) images[0] can be a string url
    if (typeof img0 === "string" && img0.trim()) return img0.trim();

    // 2) images[0] can be an object (different possible keys)
    const fromImagesObj =
        img0?.location ||
        img0?.url ||
        img0?.image ||
        img0?.mandirAppImage ||
        "";

    if (typeof fromImagesObj === "string" && fromImagesObj.trim())
        return fromImagesObj.trim();

    // 3) mandirAppImage can be string or object
    const appImg = mandir?.mandirAppImage;
    if (typeof appImg === "string" && appImg.trim()) return appImg.trim();

    const fromAppObj = appImg?.location || appImg?.url || "";
    if (typeof fromAppObj === "string" && fromAppObj.trim()) return fromAppObj.trim();

    return "";
};

const MandirDetailsSection = ({ mandir }: { mandir: any }) => {
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState<"about" | "history">("about");

    // ✅ Works for both:
    // - chadhava api: mandir = { ... }
    // - mandir api:   mandir = { mandir: { ... } }
    const m = useMemo(() => mandir?.mandir ?? mandir, [mandir]);

    const imageUrl = useMemo(() => getMandirImageUrl(m), [m]);

    if (!m) return null;

    const aboutHtml = m?.mandirSectionIntro || "";
    const historyHtml = m?.mandirSectionHistory || "";

    return (
        <section className="mx-3 mt-3 mb-3 overflow-hidden rounded-2xl border border-[#B21E24]/15 bg-[#B21E24]/[0.04] shadow-sm">
            {/* Accordion Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
                <span className="text-[16px] font-bold text-slate-900">Mandir Details</span>
                <KeyboardArrowDown
                    className={`transition-transform duration-300 text-slate-900 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* Accordion Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                    }`}
            >
                <div className="px-4 pb-4 pt-0">
                    {/* Image */}
                    {imageUrl ? (
                        <div className="mb-4 overflow-hidden rounded-xl">
                            <img
                                src={imageUrl}
                                alt={m.nameEnglish || "Mandir"}
                                className="h-48 w-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    const fallback =
                                        typeof m?.mandirAppImage === "string"
                                            ? m.mandirAppImage
                                            : m?.mandirAppImage?.location || m?.mandirAppImage?.url || "";

                                    if (fallback && e.currentTarget.src !== fallback) {
                                        e.currentTarget.src = fallback;
                                    } else {
                                        e.currentTarget.style.display = "none";
                                    }
                                }}
                            />
                        </div>
                    ) : null}

                    {/* Tabs */}
                    <div className="mb-4 flex gap-3">
                        <button
                            onClick={() => setSelectedTab("about")}
                            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors ${selectedTab === "about"
                                ? "bg-[#B21E24]/10 text-[#B21E24] border border-[#B21E24]/25"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            About
                        </button>
                        <button
                            onClick={() => setSelectedTab("history")}
                            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors ${selectedTab === "history"
                                ? "bg-[#B21E24]/10 text-[#B21E24] border border-[#B21E24]/25"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            History
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="space-y-4 text-[13px] leading-relaxed text-slate-700">
                        {selectedTab === "about" ? (
                            <div dangerouslySetInnerHTML={{ __html: aboutHtml }} />
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: historyHtml }} />
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

/* ------------------------------ API DATA START ------------------------------ */
const NewChadhavaDetailContent = () => {
  /** Prices display in the devotee's own currency; the India list price is the
   *  input and the server owns the markup. See lib/currency.ts. */
  const { money } = useMoney();
    const { setMusicUrl } = useMusic();

    const routeParams = useParams();
    // The route param is a "name-id" slug (see lib/slug.ts) — recover the real
    // Mongo id for the lookup below. A bare legacy id still works unchanged.
    const id = extractIdFromSlug(routeParams?.id as string | undefined);
    const searchParams = useSearchParams();
    const queryParams = useMemo(() => new URLSearchParams(searchParams?.toString() ?? ""), [searchParams]);
    const { data: apiData, isLoading: loading } = useNewChadhavaDetailQuery(id);
    // New hook for Mandir Data
    const extractMandirId = (m: any) =>
        m?.mandirId?._id || m?.mandirId?.$oid || m?.mandirId || null;

    const mandirId = useMemo(() => {
        const m = apiData?.selectedMandirs?.[0];
        return extractMandirId(m);
    }, [apiData?.selectedMandirs]);

    const { data: rawMandirData } = useMandirDetailQuery(mandirId || "");

    // ---- Interruptible slow auto-scroll ----
    const scrollTargetRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (loading || !apiData) return;

        let rafId: number;
        let cancelled = false;

        const cancel = () => { cancelled = true; };

        // Listen for any user interaction → cancel auto-scroll
        window.addEventListener('wheel', cancel, { once: true, passive: true });
        window.addEventListener('touchstart', cancel, { once: true, passive: true });
        window.addEventListener('touchmove', cancel, { once: true, passive: true });
        window.addEventListener('keydown', cancel, { once: true });
        window.addEventListener('mousedown', cancel, { once: true });

        const cleanup = () => {
            cancelAnimationFrame(rafId);
            window.removeEventListener('wheel', cancel);
            window.removeEventListener('touchstart', cancel);
            window.removeEventListener('touchmove', cancel);
            window.removeEventListener('keydown', cancel);
            window.removeEventListener('mousedown', cancel);
        };

        const startTimer = setTimeout(() => {
            if (cancelled) { cleanup(); return; }

            const startY = window.pageYOffset;

            // Determine scroll targets based on screen size (mobile vs desktop)
            const isMobile = window.innerWidth < 1024;

            // On mobile, the hero section is usually taller and elements are stacked,
            // so we need a larger fallback scroll distance to reach the Chadhava products.
            // On desktop, the layout is wider, so less vertical scrolling is required.
            const fallbackHeight = isMobile ? window.innerHeight * 0.55 : window.innerHeight * 0.55;
            const minDistance = isMobile ? window.innerHeight * 0.45 : window.innerHeight * 0.45;

            let targetY = startY + fallbackHeight;

            if (scrollTargetRef.current) {
                // Offset by 20px so we stop just above the target element
                const elTop = scrollTargetRef.current.getBoundingClientRect().top + startY - 70;
                // Ensure meaningful motion on all screen sizes
                targetY = Math.max(elTop, startY + minDistance);
            }

            const distance = targetY - startY;
            if (distance < 10) { cleanup(); return; } // already there

            const DURATION = 5000; // 5 seconds → very slow
            let startTime: number | null = null;

            const easeInOutCubic = (t: number) =>
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const step = (now: number) => {
                if (cancelled) { cleanup(); return; }
                if (startTime === null) startTime = now;
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / DURATION, 1);
                window.scrollTo(0, startY + distance * easeInOutCubic(progress));
                if (progress < 1) {
                    rafId = requestAnimationFrame(step);
                } else {
                    cleanup();
                }
            };

            rafId = requestAnimationFrame(step);
        }, 1200); // 1.2s delay before starting

        return () => {
            clearTimeout(startTimer);
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, apiData]);
    // ---- End auto-scroll ----


    const mandirLive = useMemo(() => {
        if (!rawMandirData) return null;

        // mandir.api.ts: fetchMandirById returns res.data?.mandir || res.data?.data
        // So rawMandirData should be the mandir object itself.
        const m = rawMandirData;

        // ✅ Keep ONLY required fields for mandir section
        const next = {
            nameEnglish: m?.nameEnglish,
            images: m?.images,
            mandirAppImage: m?.mandirAppImage,
            mandirSectionIntro: m?.mandirSectionIntro,
            mandirSectionHistory: m?.mandirSectionHistory,
            // Also need city for prasad description if used
            city: m?.city,
        };

        // ✅ IMPORTANT: only set if we actually got something useful
        const hasUseful =
            !!next?.nameEnglish ||
            !!next?.mandirSectionIntro ||
            !!next?.mandirSectionHistory ||
            !!getMandirImageUrl(next);

        return hasUseful ? next : null;
    }, [rawMandirData]);



    useEffect(() => {
        if (apiData) {
            fbqTrack("ViewContent", {
                content_ids: [apiData._id || "chadhava"],
                content_name: apiData.chadhavaName || "Chadhava",
                content_category: apiData.selectedMandirs?.[0]?.nameEnglish || "Chadhava",
                content_type: "product",
                currency: "INR",
            });
            gtag("event", "view_item", {
                currency: "INR",
                items: [{
                    item_id: apiData._id || "chadhava",
                    item_name: apiData.chadhavaName || "Chadhava",
                    item_category: apiData.selectedMandirs?.[0]?.nameEnglish || "Chadhava",
                }],
            });

            if (apiData.music) {
                setMusicUrl(apiData.music);
            }
        }
    }, [apiData, setMusicUrl]);

    /* ------------------------------ DATA MAPPING ------------------------------ */
    const banners: Banner[] = useMemo(
        () => apiData?.chadhavaInnerImages?.map((img: any, idx: number) => ({
            id: `b${idx}`,
            image: img.location,
            title: apiData?.chadhavaName || "",
            subtitle: "Vedic Vaibhav Special"
        })) || [],
        [apiData]
    );

    const rating = apiData?.rating || 4.8;
    const reviewCount = 58; // Static for now

    const benefits: BenefitTag[] = useMemo(
        () => apiData?.benefits?.map((b: any, idx: number) => ({ id: `t${idx}`, text: b.description })) || [],
        [apiData]
    );

    const giftTiers: GiftTier[] = useMemo(
        () => apiData?.offers?.map((offer: any, idx: number) => ({
            id: offer._id || `g${idx}`,
            title: offer.offerName || "Gift",
            // Assuming offerStartPrice as the unlock threshold based on user intent description
            subtitle: `Unlock on offering above ${money(offer.offerStartPrice || 500)}`,
            minAmount: offer.offerStartPrice || 500,
            image: offer.images?.[0]?.location || "https://via.placeholder.com/150",
        })) || [],
        [apiData]
    );

    // Flatten all ITEMS from all sections (type !== 'combo') using chadhavaSections
    const singleItems: SingleItem[] = useMemo(() => {
        if (!apiData?.chadhavaSections) return [];
        const all: SingleItem[] = [];
        apiData.chadhavaSections.forEach((sec: any) => {
            sec.items?.forEach((it: any) => {
                if (it.type !== 'combo') {
                    all.push({
                        id: it.itemName,
                        name: it.itemName,
                        price: it.itemPrice,
                        desc: it.itemDesc,
                        image: it.itemImage?.location || ""
                    });
                }
            });
        });
        return all;
    }, [apiData]);

    // Flatten all COMBOS from all sections (type === 'combo') using chadhavaSections
    const combos: Combo[] = useMemo(() => {
        if (!apiData?.chadhavaSections) return [];
        const all: Combo[] = [];
        apiData.chadhavaSections.forEach((sec: any) => {
            sec.items?.forEach((it: any) => {
                if (it.type === 'combo') {
                    const price = it.discountedPrice > 0 ? it.discountedPrice : it.itemPrice;
                    const mrp = it.itemPrice;
                    let badgeText = "Special";

                    if (it.discountedPrice > 0 && mrp > price) {
                        const discountPercent = Math.round(((mrp - price) / mrp) * 100);
                        badgeText = `Save ${discountPercent}%`;
                    }

                    all.push({
                        id: it.itemName,
                        title: it.itemName,
                        price: price,
                        mrp: mrp,
                        image: it.itemImage?.location || "",
                        items: [], // Structure difference
                        desc: it.itemDesc,
                        badgeText: badgeText,
                    });
                }
            });
        });
        return all;
    }, [apiData]);




    const chadhavaName = apiData?.chadhavaName;
    const mandirName = apiData?.selectedMandirs?.[0]?.nameEnglish || "";
    const chadhavaDate = apiData?.availableDates?.[0] || "";

    const chadhavaDetailsText = parseQuillDescription(apiData?.description);

    /* ------------------------------ STATE ------------------------------ */
    const [activeBanner, setActiveBanner] = useState(0);
    const [detailsOpen, setDetailsOpen] = useState(true);

    const [selectedSingles, setSelectedSingles] = useState<Record<string, number>>(
        {}
    );
    const [selectedCombos, setSelectedCombos] = useState<Record<string, number>>({});
    const [giftSelected, setGiftSelected] = useState<Record<string, boolean>>({});
    const [selectedItemForModal, setSelectedItemForModal] = useState<any | null>(null);

    // Modern toast notification (replaces alert())
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showToast = (message: string, type: "success" | "error" = "success") => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    };

    // Scroll direction hint: 'down' when near top, 'up' when scrolled down, 'none' at very bottom
    const [scrollDir, setScrollDir] = useState<'down' | 'up' | 'none'>('down');
    useEffect(() => {
        const onScroll = () => {
            const scrollY = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            if (maxScroll <= 0) { setScrollDir('none'); return; }
            const pct = scrollY / maxScroll;
            if (pct > 0.82) setScrollDir('up');        // scrolled past 12% — show up arrow
            else setScrollDir('down');                  // still near top — show down arrow
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const totalAmount = useMemo(() => {
        let total = 0;
        for (const [id, qty] of Object.entries(selectedSingles)) {
            const it = singleItems.find((x) => x.id === id);
            if (it && qty > 0) total += it.price * qty;
        }
        for (const [id, qty] of Object.entries(selectedCombos)) {
            const c = combos.find((x) => x.id === id);
            if (c && qty > 0) total += c.price * qty;
        }
        return total;
    }, [selectedSingles, selectedCombos, singleItems, combos]);

    const [showPrasadPopup, setShowPrasadPopup] = useState(false);
    const [prasadSelected, setPrasadSelected] = useState(false);
    const [_needPrasad, setNeedPrasad] = useState(false);
    const [showEmptyCartModal, setShowEmptyCartModal] = useState(false);
    const router = useRouter();

    const prasad = useMemo(() => {
        if (!apiData) return null;
        const mandir = apiData.selectedMandirs?.[0];
        const chadhavaName = apiData.chadhavaName;
        const mandirName = mandir?.nameEnglish || "Mandir";

        // Prefer chadhava images; fall back to mandir image
        const img =
            apiData.chadhavaInnerImages?.[0]?.location ||
            mandir?.mandirAppImage ||
            mandir?.images?.[0] ||
            "https://via.placeholder.com/320x200?text=Prasad";

        return {
            // 🔁 dynamic
            name: `${mandirName} Prasad Box`,
            desc: `Assorted satvik prasad blessed during ${chadhavaName}, prepared at ${mandirName}${mandir?.city ? `, ${mandir.city}` : ""
                }.`,
            image: img,

            // 🔒 fixed
            price: 298,
        };
    }, [apiData]);

    const basePuja = useMemo(() => {
        const mandir = apiData?.selectedMandirs?.[0];
        const img = apiData?.chadhavaInnerImages?.[0]?.location ||
            mandir?.mandirAppImage ||
            mandir?.images?.[0] || "";

        return {
            chadhavaId: apiData?._id || "",
            title: apiData?.chadhavaName || "",
            temple: mandir?.nameEnglish || "",
            date: apiData?.availableDates?.[0] || "",
            rating: apiData?.rating || 4.8,
            ratingCount: 58,
            details: apiData?.description || "",
            image: img,
        };
    }, [apiData]);

    // Optimize Timer Calculation
    const targetDate = useMemo(() => {
        const dateStr = apiData?.availableDates?.[0];
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        d.setHours(23, 59, 59, 999);
        return d;
    }, [apiData?.availableDates]);

    const isEventEnded = useMemo(() => {
        const parseBool = (v: any) => v === true || v === "true" || v === 1 || v === "1";
        const isInactive = apiData ? !parseBool(apiData.isActive) : false;
        const isExpired = targetDate ? new Date() > targetDate : false;
        return isInactive || isExpired;
    }, [apiData, targetDate]);

    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        timerRef.current = window.setInterval(() => {
            setActiveBanner((p) => (p + 1) % banners.length);
        }, 3500);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [banners.length]);

    /* ------------------------------ HANDLERS ------------------------------ */
    // Swipe Handlers
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            setActiveBanner((prev) => (prev + 1) % banners.length);
        }
        if (isRightSwipe) {
            setActiveBanner((prev) => (prev - 1 + banners.length) % banners.length);
        }
    };

    const handleParticipate = () => {
        // Expiry Check
        if (isEventEnded) {
            showToast("This Chadhava event has ended. You can no longer participate.", "error");
            return;
        }

        const hasCombos = Object.keys(selectedCombos).length > 0;
        const hasSingles = Object.keys(selectedSingles).length > 0;

        if (!hasCombos && !hasSingles) {
            setShowEmptyCartModal(true);
            return;
        }

        // Open Prasad Popup
        setShowPrasadPopup(true);
    };

    const navigateToPayment = (wantsPrasad: boolean) => {
        // Track AddToCart before navigating
        const contents = [];

        // Singles
        for (const [id, qty] of Object.entries(selectedSingles)) {
            const it = singleItems.find((x) => x.id === id);
            if (it) {
                contents.push({
                    id: it.id,
                    name: it.name,
                    quantity: qty,
                    item_price: it.price
                });
            }
        }

        // Combos
        for (const [id, qty] of Object.entries(selectedCombos)) {
            const c = combos.find((x) => x.id === id);
            if (c) {
                contents.push({
                    id: c.id,
                    name: c.title,
                    quantity: qty,
                    item_price: c.price
                });
            }
        }

        const value = totalAmount + (wantsPrasad && prasad ? prasad.price : 0);

        fbqTrack("AddToCart", {
            content_ids: contents.map(c => c.id),
            content_name: chadhavaName || "Chadhava",
            content_category: mandirName || "Chadhava",
            content_type: "product",
            contents: contents,
            value: toInr(value),
            currency: "INR",
        });
        gtag("event", "add_to_cart", {
            currency: "INR",
            value: toInr(value),
            items: contents.map(c => ({
                item_id: c.id,
                item_name: c.name,
                item_category: mandirName || "Chadhava",
                price: c.item_price,
                quantity: c.quantity,
            })),
        });

        setShowPrasadPopup(false);
        const stateObj = {
            selected: selectedSingles,
            selectedCombos: selectedCombos,
            comboPlans: combos,
            accessoriesList: singleItems,
            giftSelected: giftSelected,
            giftList: giftTiers,
            prasad: prasad,
            needPrasad: wantsPrasad,
            basePuja: basePuja,
            familySize: 0,
            totalAmount: totalAmount + (wantsPrasad && prasad ? prasad.price : 0)
        };
        try {
            sessionStorage.setItem("vv_chadhava_payment_state", JSON.stringify(stateObj));
        } catch {}
        router.push("/newchadhavapaymentpage");
    };

    const handleSkipPrasad = () => {
        setNeedPrasad(false);
        navigateToPayment(false);
    };

    const handleEnterPrasadDetails = () => {
        setNeedPrasad(true);
        setPrasadSelected(true);
        navigateToPayment(true);
    };
    const changeQty = (id: string, delta: number) => {
        userHasInteracted.current = true;
        setSelectedSingles((prev) => {
            const next = { ...prev };
            const cur = next[id] ?? 0;
            const updated = clamp(cur + delta, 0, 99);
            if (updated <= 0) delete next[id];
            else next[id] = updated;
            return next;
        });
    };

    const changeComboQty = (id: string, delta: number) => {
        userHasInteracted.current = true;
        setSelectedCombos((prev) => {
            const next = { ...prev };
            const cur = next[id] ?? 0;
            const updated = clamp(cur + delta, 0, 99);
            if (updated <= 0) delete next[id];
            else next[id] = updated;
            return next;
        });
    };

    const isGiftUnlocked = (minAmount: number) => totalAmount >= minAmount;

    /* ------------------------------ EFFECTS & LOGIC ------------------------------ */

    // Default select the item specified in URL query params, or first item as fallback
    const hasSetDefault = useRef(false);
    useEffect(() => {
        if (!hasSetDefault.current && (singleItems.length > 0 || combos.length > 0)) {
            let found = false;

            const newSelectedSingles: Record<string, number> = {};
            const newSelectedCombos: Record<string, number> = {};

            // Check for item names in query params (e.g., ?dhatura=true&belpatra=true)
            for (const [key, value] of queryParams.entries()) {
                if (value?.toLowerCase() === 'true') {
                    const normalizedKey = key.trim().toLowerCase();

                    // Look in single items
                    const matchingSingles = singleItems.filter(it =>
                        it.name.trim().toLowerCase() === normalizedKey ||
                        it.id.trim().toLowerCase() === normalizedKey
                    );
                    matchingSingles.forEach(it => {
                        newSelectedSingles[it.id] = 1;
                        found = true;
                    });

                    // Look in combos
                    const matchingCombos = combos.filter(c =>
                        c.title.trim().toLowerCase() === normalizedKey ||
                        c.id.trim().toLowerCase() === normalizedKey
                    );
                    matchingCombos.forEach(c => {
                        newSelectedCombos[c.id] = 1;
                        found = true;
                    });
                }
            }

            if (found) {
                if (Object.keys(newSelectedSingles).length > 0) setSelectedSingles(newSelectedSingles);
                if (Object.keys(newSelectedCombos).length > 0) setSelectedCombos(newSelectedCombos);
            }

            if (!found) {
                if (singleItems.length > 0) {
                    // Select the first single item
                    const firstSingle = singleItems[0];
                    setSelectedSingles({ [firstSingle.id]: 1 });
                } else if (combos.length > 0) {
                    // Fallback: select the first combo shown at the top of the list
                    setSelectedCombos({ [combos[0].id]: 1 });
                }
            }
            hasSetDefault.current = true;
        }
    }, [singleItems, combos, queryParams]);

    // Gift Unlock Logic
    const [popupGift, setPopupGift] = useState<GiftTier | null>(null);
    const [claimSuccessGift, setClaimSuccessGift] = useState<GiftTier | null>(null);
    const notifiedGifts = useRef<Set<string>>(new Set());

    // Auto-close gift claimed modal after 1.8 seconds
    useEffect(() => {
        if (!claimSuccessGift) return;
        const timer = setTimeout(() => setClaimSuccessGift(null), 1800);
        return () => clearTimeout(timer);
    }, [claimSuccessGift]);
    const userHasInteracted = useRef(false);

    useEffect(() => {
        giftTiers.forEach(g => {
            // Unlock logic — only show popup after user has interacted
            if (isGiftUnlocked(g.minAmount) && !notifiedGifts.current.has(g.id)) {
                notifiedGifts.current.add(g.id);
                if (userHasInteracted.current) {
                    setPopupGift(g);
                }
            }

            // Lock/Remove logic — also clear from notifiedGifts so re-unlocking shows popup
            if (totalAmount < g.minAmount) {
                if (giftSelected[g.id]) {
                    setGiftSelected((prev) => {
                        const next = { ...prev };
                        delete next[g.id];
                        return next;
                    });
                }
                notifiedGifts.current.delete(g.id);
            }
        });
    }, [totalAmount, giftTiers, giftSelected]);

    // CART PERSISTENCE: Save state to sessionStorage
    const isLoaded = useRef(false);

    useEffect(() => {
        if (!apiData?._id) return;
        if (!isLoaded.current) return; // Don't save until loaded

        const cartState = {
            singles: selectedSingles,
            combos: selectedCombos,
            gifts: giftSelected,
            prasadWanted: _needPrasad
        };
        sessionStorage.setItem(`vv_cart_${apiData._id}`, JSON.stringify(cartState));
    }, [selectedSingles, selectedCombos, giftSelected, _needPrasad, apiData]);

    // CART PERSISTENCE: Load state on mount
    useEffect(() => {
        if (!apiData?._id) return;
        try {
            const saved = sessionStorage.getItem(`vv_cart_${apiData._id}`);
            // Priority: URL query defaults > Session Storage Cart > Initial item defaults
            if (saved && !hasSetDefault.current) {
                const parsed = JSON.parse(saved);

                // Only restore if we have actual items
                const hasSingles = parsed.singles && Object.keys(parsed.singles).length > 0;
                const hasCombos = parsed.combos && Object.keys(parsed.combos).length > 0;

                if (hasSingles || hasCombos) {
                    if (parsed.singles) setSelectedSingles(parsed.singles);
                    if (parsed.combos) setSelectedCombos(parsed.combos);
                    if (parsed.gifts) setGiftSelected(parsed.gifts);
                    if (parsed.prasadWanted !== undefined) setNeedPrasad(parsed.prasadWanted);
                    hasSetDefault.current = true; // Mark as settled
                }
            }
        } catch (e) {
            console.error("Failed to load cart state", e);
        } finally {
            isLoaded.current = true; // Mark as loaded so future changes can be saved
        }
    }, [apiData?._id]);

    const toggleGift = (id: string) => {
        const isSelecting = !giftSelected[id];
        setGiftSelected((p) => ({ ...p, [id]: isSelecting }));

        if (isSelecting) {
            // Confetti effect
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                zIndex: 9999,
            });

            // Show success popup
            const gift = giftTiers.find(g => g.id === id);
            if (gift) setClaimSuccessGift(gift);

            // Close unlock popup if open
            setPopupGift(null);
        }
    };

    const shareChadhava = async () => {
        const shareUrl = window.location.href || "https://vedicvaibhav.in/chadhava";
        const dateStr = chadhavaDate ? formatChadhavaDate(chadhavaDate) : "";
        const title = chadhavaName || "Chadhava Seva";
        const text = `🙏 ${title}${mandirName ? ` at ${mandirName}` : ""}${dateStr ? ` on ${dateStr}` : ""}\n\nOffer your Chadhava with devotion and receive blessings. Chadhava is offered in your Name & Gotra with a video on WhatsApp.\n\n🔗 Participate now:`;
        try {
            if (navigator.share) {
                await navigator.share({ title, text, url: shareUrl });
                return;
            }
            await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
            showToast("Link copied ");
        } catch {
            try {
                await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
                showToast("Link copied ");
            } catch {
                showToast("Could not share/copy on this browser.", "error");
            }
        }
    };

    const handleClaimGift = (gift: any) => {
        if (!giftSelected[gift.id]) {
            toggleGift(gift.id);
        }
    };

    /* ------------------------------ Marquee styles ------------------------------ */
    // Tailwind can't define keyframes inline, so we use a small <style> block (still Tailwind layout).
    const marqueeCss = `
@keyframes vv_marquee {
  0% { transform: translate3d(0,0,0); }
  100% { transform: translate3d(-50%,0,0); }
}
@keyframes vv_marquee_r {
  0% { transform: translate3d(-50%,0,0); }
  100% { transform: translate3d(0,0,0); }
}
@keyframes pop {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(202, 53, 0, 0.2)); }
  50% { transform: scale(1.05); filter: drop-shadow(0 0 8px rgba(202, 53, 0, 0.6)); }
}
@keyframes slideDown {
  0% { opacity: 0; transform: translate(-50%, -100%); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes scrollFloat {
  0%, 100% { transform: translateY(0); opacity: 0.95; }
  50% { transform: translateY(-7px); opacity: 1; }
}
/* Slim horizontal scrollbar for the free-gifts carousel */
.vv-thin-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(91,91,255,0.35) transparent;
}
.vv-thin-scroll::-webkit-scrollbar {
  height: 4px;
}
.vv-thin-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.vv-thin-scroll::-webkit-scrollbar-thumb {
  background: rgba(91,91,255,0.35);
  border-radius: 9999px;
}
`;

    /* ------------------------------ RENDER ------------------------------ */
    if (loading) return <Loadinggif />;
    if (!apiData) return <Loadinggif />;

    return (
        <div
            className="min-h-screen text-[#2A2018]"
            style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                background: "radial-gradient(120% 80% at 50% -10%, #FFFDF9 0%, #FEFAF3 45%, #FCF5EA 100%)",
            }}
        >
            <style>{marqueeCss}</style>

            {/* ---- Scroll hint button (down near top, up after scrolling) ---- */}
            {scrollDir !== 'none' && (
                <button
                    onClick={() => {
                        if (scrollDir === 'down') window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' });
                        else window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="fixed bottom-32 right-4 md:right-[calc(50%-199px)] z-[90] flex flex-col items-center gap-1 transition-opacity duration-300"
                    style={{ animation: "scrollFloat 2s ease-in-out infinite" }}
                    aria-label={scrollDir === 'down' ? 'Scroll down' : 'Scroll to top'}
                >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#C93338] to-[#B21E24] flex items-center justify-center shadow-[0_4px_14px_rgba(142,38,38,0.35)]">
                        <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
                            style={{ transition: 'transform 0.3s ease', transform: scrollDir === 'up' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                            <path d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </button>
            )}

            {/* ---- Modern Animated Toast ---- */}
            {toast && (
                <div
                    className="fixed top-4 left-1/2 z-[200] -translate-x-1/2 animate-[slideDown_0.3s_ease-out]"
                    style={{ animation: "slideDown 0.3s ease-out" }}
                >
                    <div className={`flex items-center gap-2 rounded-full px-5 py-2.5 shadow-lg backdrop-blur-md text-sm font-semibold ${toast.type === "success"
                        ? "bg-emerald-50/95 text-emerald-800 border border-emerald-200 shadow-emerald-100"
                        : "bg-red-50/95 text-red-800 border border-red-200 shadow-red-100"
                        }`}>
                        <span className="text-base">{toast.type === "success" ? "✅" : "❌"}</span>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {/* mobile shell */}
            <div className="mx-auto  max-w-[430px]">
                {/* ---------------- Banner ---------------- */}
                <section className="px-3 pt-6">
                    <div
                        className="relative overflow-hidden rounded-[18px] bg-black shadow-[0_8px_22px_rgba(0,0,0,0.08)]"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        {banners.map((b, idx) => (
                            <div
                                key={b.id}
                                className={[
                                    "transition-opacity duration-500 will-change-opacity",
                                    idx === activeBanner ? "relative opacity-100" : "absolute inset-0 opacity-0",
                                ].join(" ")}
                                aria-hidden={idx !== activeBanner}
                            >
                                <img loading="lazy" src={b.image} alt="Chadhava" className="w-full h-auto object-contain" />
                                {/* rating (left side) */}
                                <div className="absolute bottom-2 left-2 z-[3] inline-flex items-center gap-1 rounded-full border border-black/5 bg-white/90 px-2 py-1">
                                    <span className="text-[14px] leading-none text-amber-500">★</span>
                                    <span className="text-[13px] font-extrabold">{rating.toFixed(1)}</span>
                                    <span className="text-[10px] text-gray-500">({reviewCount})</span>
                                </div>
                            </div>
                        ))}
                        {/* dots (inside banner) */}
                        <div className="absolute bottom-3 left-1/2 z-[4] flex -translate-x-1/2 items-center justify-center gap-2">
                            {banners.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveBanner(i)}
                                    aria-label={`Banner ${i + 1}`}
                                    className={[
                                        "h-2 rounded-full transition-all",
                                        i === activeBanner ? "w-5 bg-white" : "w-2 bg-white/60",
                                    ].join(" ")}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* ---------------- Title + share ---------------- */}
                <section className="mx-3 mt-2 ">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-[16px] font-semibold font-sans leading-tight tracking-tight text-slate-900">
                                {chadhavaName}
                            </h1>
                            <div className="mt-1.5 mb-2 flex flex-col gap-1">
                                <div className="mt-1 text-[12px] text-black/60">🛕 {mandirName}</div>
                                <div className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500">
                                    <span className="shrink-0">📅</span>
                                    <span>{formatChadhavaDate(chadhavaDate)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={shareChadhava}
                            title="Share"
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#F3DAD3] to-[#E7C0B8] text-[#B21E24] shadow-sm ring-1 ring-[#B21E24]/20 transition-transform active:scale-95"
                        >
                            <span className="text-[16px]"><Share /></span>
                        </button>
                    </div>

                </section>




                {/* ---------------- Name & Gotra ---------------- */}
                <section className="mx-3 mt-0">
                    <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-100 px-1 py-2">
                        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-800">
                            Chadhava Offered in your Name & Gotra
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-green-700">
                            📱 Receive chadhava video with your name & gotra on WhatsApp
                        </div>
                    </div>
                </section>





                <div className="space-y-1 bg-[#white] pb-3">
                    {/* ---------------- Free gifts (above chadhava listing) ---------------- */}
                    {giftTiers.length > 0 && (
                        <section className="mx-3 mt-3">
                            <div className="vv-thin-scroll mt-3 flex gap-3 overflow-x-auto pb-1 pr-2 [-webkit-overflow-scrolling:touch]">
                                {giftTiers.map((g) => {
                                    const unlocked = isGiftUnlocked(g.minAmount);
                                    const selected = !!giftSelected[g.id];
                                    return (
                                        <div
                                            key={g.id}
                                            className={[
                                                "min-w-[280px] flex flex-col overflow-hidden rounded-xl border border-[#5B5BFF]/40 bg-white",
                                                "shadow-[0_8px_18px_rgba(0,0,0,0.06)]",
                                                selected ? "ring-2 ring-emerald-600/20" : "",
                                            ].join(" ")}
                                        >
                                            <div className="flex flex-1 gap-3 p-2">
                                                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-gray-100">
                                                    <img src={g.image} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
                                                </div>
                                                <div className="min-w-0 flex-1 flex flex-col">
                                                    <div className="leading-tight">
                                                        <span className="mr-1 text-[12px] font-black text-red-600">FREE</span>
                                                        <span className="text-[13px] font-semibold text-black/90">{g.title.replace(/^FREE\s*/i, "")}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={!unlocked}
                                                        onClick={() => unlocked && toggleGift(g.id)}
                                                        className={[
                                                            "mt-auto flex w-full items-center justify-center gap-1 rounded-md border px-3 py-2 text-[12px] font-semibold",
                                                            !unlocked
                                                                ? "cursor-not-allowed border-black/15 bg-gray-200 text-black/70"
                                                                : selected
                                                                    ? "bg-emerald-600 text-white border-transparent shadow-md shadow-emerald-200"
                                                                    : "border-emerald-600/20 bg-emerald-600/10 text-emerald-900",
                                                        ].join(" ")}
                                                    >
                                                        {!unlocked ? <Lock fontSize="small" /> : null}
                                                        {!unlocked ? "Claim" : selected ? "Claimed" : "Click to Claim"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="mt-auto bg-gradient-to-r from-[#474AEB] to-[#FFEDD4] px-3 py-2 text-center text-[12px] font-semibold text-white">
                                                On offering Chadhava above {money(g.minAmount)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                    {apiData?.chadhavaSections?.map((section: any, secIdx: number) => {
                        const sectionItems = (section.items?.filter((i: any) => i.type !== 'combo') || []).sort((a: any, b: any) => a.itemPrice - b.itemPrice);
                        const sectionCombos = (section.items?.filter((i: any) => i.type === 'combo') || []).sort((a: any, b: any) => {
                            const priceA = a.discountedPrice > 0 ? a.discountedPrice : a.itemPrice;
                            const priceB = b.discountedPrice > 0 ? b.discountedPrice : b.itemPrice;
                            return priceB - priceA;
                        });

                        if (sectionItems.length === 0 && sectionCombos.length === 0) return null;

                        return (
                            <Fragment key={secIdx}>
                                <section ref={secIdx === 0 ? scrollTargetRef : undefined} className="mx-3 mt-4 overflow-hidden rounded-[18px] bg-[#FFFDF8] ring-1 ring-[#C9A24B]/20 shadow-[0_14px_34px_-16px_rgba(96,42,14,0.32)]">
                                    {/* header */}
                                    <div className="relative flex items-center gap-3 bg-gradient-to-b from-[#FFFDF8] to-[#FFF7EA] px-5 py-2">
                                        <h2 className="m-0 text-[20px] leading-none font-bold tracking-[0.4px] text-[#8C1519]" style={{ fontFamily: "Marcellus, serif" }}>{section.sectionName}</h2>
                                        <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C9A24B] to-transparent opacity-70" />
                                    </div>

                                    {/* body */}
                                    <div className="flex flex-col gap-3.5 px-3 pb-3.5 pt-3">
                                        {/* combo cards (shown first, at the top) */}
                                        {sectionCombos.map((c: any) => {
                                            const id = c.itemName; // Use itemName as ID
                                            const qty = selectedCombos[id] ?? 0;
                                            const price = c.discountedPrice > 0 ? c.discountedPrice : c.itemPrice;
                                            const mrp = c.itemPrice;
                                            let badgeText = "Special";

                                            if (c.discountedPrice > 0 && mrp > price) {
                                                const discountPercent = Math.round(((mrp - price) / mrp) * 100);
                                                badgeText = `Save ${discountPercent}%`;
                                            }
                                            const hasDiscount = c.discountedPrice > 0 && mrp > price;
                                            // Compose the combo image strip from the section's single items
                                            // (a combo bundles those items); fall back to the combo's own image.
                                            const singleImages = sectionItems
                                                .map((s: any) => s.itemImage?.location)
                                                .filter(Boolean);
                                            const comboImages = (singleImages.length > 0
                                                ? singleImages
                                                : [c.itemImage?.location || ""]
                                            ).slice(0, 3);
                                            return (
                                                <div
                                                    key={id}
                                                    className="cursor-pointer overflow-hidden rounded-[18px] bg-white ring-1 ring-[#F0E5D3] shadow-[0_14px_34px_-16px_rgba(96,42,14,0.32)]"
                                                    onClick={() => setSelectedItemForModal({ ...c, type: 'combo', id, price, mrp })}
                                                >
                                                    {/* media: combo image */}
                                                    <div className="relative p-2.5">
                                                        <span className="absolute left-4 top-4 z-[3] rounded-lg bg-gradient-to-br from-[#F6A11E] to-[#EC7A12] px-2.5 py-1.5 text-[0.56rem] font-extrabold uppercase tracking-[0.4px] text-white shadow-[0_6px_14px_-6px_rgba(236,122,18,0.7)]">
                                                            Combo Pack
                                                        </span>
                                                        {hasDiscount && (
                                                            <span className="absolute right-4 top-4 z-[3] rounded-lg bg-gradient-to-br from-[#C93338] to-[#8C1519] px-2.5 py-1.5 text-[0.68rem] font-extrabold tracking-[0.3px] text-white shadow-[0_6px_14px_-6px_rgba(140,21,25,0.65)] ring-1 ring-white/20">
                                                                {badgeText}
                                                            </span>
                                                        )}
                                                        <div className="overflow-hidden rounded-xl bg-gray-100 ring-1 ring-[#C9A24B]/20">
                                                            <img
                                                                src={c.itemImage?.location || comboImages[0] || ""}
                                                                alt={c.itemName}
                                                                className="h-35 w-full object-cover"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* body */}
                                                    <div className="px-4 pb-4 ">
                                                        <h3 className="mb-1 text-[16px] font-semibold leading-tight tracking-[-0.2px] text-[#2A2018]">
                                                            {c.itemName}
                                                        </h3>
                                                        <p className="m-0 line-clamp-2 text-[12px] leading-[1.35] text-[#9C8B76]">
                                                            {c.itemDesc}
                                                        </p>

                                                        <div className="mt-3.5 flex items-center gap-2.5">
                                                            <div className="flex items-baseline font-extrabold leading-none tracking-[-0.5px] text-[#B21E24] tabular-nums notranslate">
                                                                <span className="text-[1.5rem]">{money(price)}</span>
                                                            </div>
                                                            {hasDiscount && (
                                                                <span className="text-[0.92rem] font-semibold text-[#B9AC98] line-through tabular-nums notranslate">{money(mrp)}</span>
                                                            )}

                                                            {qty <= 0 ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); changeComboQty(id, +1); }}
                                                                    className="ml-auto inline-flex items-center gap-1 rounded-xl bg-gradient-to-b from-[#C93338] to-[#B21E24] px-6 py-2.5 text-[0.95rem] font-bold tracking-[0.2px] text-white shadow-[0_10px_20px_-10px_rgba(178,30,36,0.8),inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform active:scale-95"
                                                                >
                                                                    Add<span className="font-extrabold opacity-90">+</span>
                                                                </button>
                                                            ) : (
                                                                <div className="ml-auto inline-flex items-center gap-0.5 rounded-full border-[1.5px] border-[#B21E24] bg-white p-[3px] shadow-[0_8px_18px_-12px_rgba(178,30,36,0.7)]" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); changeComboQty(id, -1); }}
                                                                        className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#FDEBEB] to-[#FBDDDD] text-[1.15rem] font-extrabold leading-none text-[#8C1519]"
                                                                        aria-label="Decrease"
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <div className="min-w-[26px] text-center text-[0.98rem] font-extrabold text-[#8C1519] tabular-nums notranslate">{qty}</div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); changeComboQty(id, +1); }}
                                                                        className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-[#FDEBEB] to-[#FBDDDD] text-[1.15rem] font-extrabold leading-none text-[#8C1519]"
                                                                        aria-label="Increase"
                                                                    >
                                                                        +
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* single items — text left, thumbnail right */}
                                        {sectionItems.length > 0 && (
                                            <div className="rounded-[18px] bg-white px-4 ring-1 ring-[#F0E5D3] shadow-[0_14px_34px_-16px_rgba(96,42,14,0.32)]">
                                                {sectionItems.map((it: any, itIdx: number) => {
                                                    const id = it.itemName; // Use itemName as ID
                                                    const image = it.itemImage?.location || "";
                                                    const price = it.itemPrice;
                                                    const qty = selectedSingles[id] ?? 0;

                                                    return (
                                                        <div
                                                            key={id}
                                                            className={`flex cursor-pointer items-start gap-3 py-4 ${itIdx === 0 ? "" : "border-t border-[#F0E5D3]"}`}
                                                            onClick={() => setSelectedItemForModal({ ...it, type: 'single', id })}
                                                        >
                                                            {/* text column */}
                                                            <div className="min-w-0 flex-1 pt-0.5">
                                                                <h3 className="mb-1 text-[16px] font-semibold leading-tight text-[#2A2018]">{it.itemName}</h3>
                                                                <p className="mb-3 line-clamp-2 text-[12px] leading-[1.35] text-[#9C8B76]">{it.itemDesc}</p>
                                                                <div className="flex items-baseline font-extrabold tracking-[-0.3px] text-[#B21E24] tabular-nums notranslate">
                                                                    <span className="text-[1.12rem]">{money(price)}</span>
                                                                </div>
                                                            </div>

                                                            {/* thumbnail + overlapping control */}
                                                            <div className="relative w-24 shrink-0 pb-4">
                                                                <div
                                                                    className="h-24 w-24 overflow-hidden rounded-[14px] bg-gray-100 bg-cover bg-center shadow-[0_10px_22px_-14px_rgba(96,42,14,0.6)] ring-1 ring-[#C9A24B]/20"
                                                                    style={{ backgroundImage: `url(${image})` }}
                                                                />
                                                                <div className="absolute inset-x-0 bottom-0 flex justify-center">
                                                                    {qty <= 0 ? (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); changeQty(id, +1); }}
                                                                            className="inline-flex items-center gap-1 rounded-[11px] bg-gradient-to-b from-[#C93338] to-[#B21E24] px-5 py-2 text-[0.86rem] font-bold text-white shadow-[0_10px_20px_-10px_rgba(178,30,36,0.8),inset_0_1px_0_rgba(255,255,255,0.22)] transition-transform active:scale-95"
                                                                        >
                                                                            Add<span className="font-extrabold opacity-90">+</span>
                                                                        </button>
                                                                    ) : (
                                                                        <div className="inline-flex items-center gap-0.5 rounded-full border-[1.5px] border-[#B21E24] bg-white p-0.5 shadow-[0_8px_18px_-12px_rgba(178,30,36,0.7)]" onClick={(e) => e.stopPropagation()}>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); changeQty(id, -1); }}
                                                                                className="grid h-[26px] w-[26px] place-items-center rounded-full bg-gradient-to-b from-[#FDEBEB] to-[#FBDDDD] text-[1.05rem] font-extrabold leading-none text-[#8C1519]"
                                                                                aria-label="Decrease"
                                                                            >
                                                                                −
                                                                            </button>
                                                                            <div className="min-w-[22px] text-center text-[0.92rem] font-extrabold text-[#8C1519] tabular-nums notranslate">{qty}</div>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); changeQty(id, +1); }}
                                                                                className="grid h-[26px] w-[26px] place-items-center rounded-full bg-gradient-to-b from-[#FDEBEB] to-[#FBDDDD] text-[1.05rem] font-extrabold leading-none text-[#8C1519]"
                                                                                aria-label="Increase"
                                                                            >
                                                                                +
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </Fragment>
                        );
                    })}
                </div>


                {/* ---------------- Puja Essentials (single chadhava slider) ---------------- */}
                <section>
                    <div className="mt-1 overflow-hidden  py-1">
                        <div
                            className="flex w-max   gap-2 "
                            style={{
                                animation: "vv_marquee 24s linear infinite",
                            }}
                        >
                            {[...benefits, ...benefits, ...benefits, ...benefits].map((t, idx) => (
                                <span
                                    key={`${t.id}-${idx}`}
                                    className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#B21E24]/25 bg-gradient-to-r from-[#F5E3DD] to-white px-3.5 py-1.5 text-[12px] font-semibold text-[#B21E24] shadow-sm"
                                >
                                    <span className="text-[#C93338]">✦</span> {t.text}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>


                <button
                    onClick={() => setDetailsOpen((p) => !p)}
                    className="mx-3 mt-3 flex w-[calc(100%-24px)] items-center justify-between gap-3 rounded-2xl border border-white/20 bg-gradient-to-r from-[#B21E24] to-[#C93338] px-4 py-3 text-white shadow-md shadow-[#B21E24]/25 transition-transform active:scale-[0.99]"
                >
                    <span className="flex items-center gap-2 text-[14px] font-bold tracking-tight">
                        📜 Chadhava Details
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20 text-white">
                        {detailsOpen ? <KeyboardArrowUp fontSize="small" /> : <KeyboardArrowDown fontSize="small" />}
                    </span>
                </button>



                {/* dropdown content */}
                <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="mx-3 mt-3 whitespace-pre-line rounded-2xl border border-dashed border-[#B21E24]/25 bg-[#B21E24]/[0.04] p-4 text-[12.5px] leading-relaxed text-slate-700">
                            {chadhavaDetailsText}
                        </div>
                    </div>
                </div>

                {/* ---------------- Mandir Details ---------------- */}
                <MandirDetailsSection mandir={mandirLive ?? apiData?.selectedMandirs?.[0]} />

                {/* Featured On Text */}
                    <div className="mt-2 text-center">
                        <span
                            style={{ animation: "pop 2s ease-in-out infinite" }}
                            className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F5E3DD] via-[#EDD0C8] to-[#F5E3DD] px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-[#B21E24] ring-1 ring-[#B21E24]/25"
                        >
                            ⭐ Featured on 200+ News Portals
                        </span>
                    </div>

                    {/* Media Ticker */}
                    <div className="mt-2 mb-2 overflow-hidden px-1">
                        <div
                            className="flex w-max gap-3 will-change-transform transform-gpu"
                            style={{
                                animation: "vv_marquee_r 20s linear infinite",
                            }}
                        >
                            {[
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-1-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-2-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-3-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-4-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-5-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-6-optimized.webp",
                                "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/BrandIntro/div-6-7-optimized.webp",
                            ].map((imgUrl, idx) => (
                                <div
                                    key={idx}
                                    className="flex h-10 w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-orange-200 bg-white p-1 shadow-sm"
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Brand ${idx}`}
                                        className="h-full w-full object-contain will-change-transform transform-gpu"
                                        style={{ transform: "translate3d(0,0,0)" }}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                {/* ---------------- Why Perform & What You Get ---------------- */}
                <NewChadhavaContent />
                <ReviewPuja />
                {/* Spacer to separate content from footer bar when at bottom */}
                <div className="pb-0"></div>

                {/* ---------------- Sticky bottom bar ---------------- */}
                <div className="sticky bottom-0 z-50 w-full overflow-hidden shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    {/* Timer Bar - Counts down to end of the chadhava date to keep active on that day */}
                    {targetDate ? (
                        <CountdownTimer targetDate={targetDate} />
                    ) : (
                        /* Loading Skeleton for Timer */
                        <div className="flex h-[42px] w-full items-center justify-center bg-[#B21E24] px-4">
                            <div className="h-6 w-48 animate-pulse rounded bg-white/20" />
                        </div>
                    )}

                    {/* Main Footer Content */}
                    <div className="relative border-t border-[#E7D8BF] bg-gradient-to-b from-[#FFF7EA] to-[#F7EAD3] px-[18px] py-3.5 backdrop-blur">
                        <span className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#C9A24B] to-transparent opacity-80" />
                        <div className="flex items-center justify-between gap-3.5">
                            <div className="flex flex-col leading-none">
                                <span className="mb-1.5 text-[0.72rem] font-semibold tracking-[0.2px] text-[#5A4C3C]">Your Chadhava</span>
                                <span className="text-[1.42rem] font-extrabold tracking-[-0.4px] text-[#8C1519] tabular-nums">
                                    <span className="notranslate">{formatINR(totalAmount)}</span>
                                    <span className="ml-0.5 text-[0.78rem] font-bold text-[#9C8B76]">/-</span>
                                </span>
                            </div>

                            <button
                                onClick={handleParticipate}
                                disabled={isEventEnded}
                                className={`inline-flex items-center gap-2 rounded-[14px] px-6 py-3.5 text-[1rem] font-extrabold uppercase tracking-[0.6px] text-white transition-all ${isEventEnded
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-br from-[#F6A11E] to-[#EC7A12] shadow-[0_14px_26px_-12px_rgba(236,122,18,0.85),inset_0_1px_0_rgba(255,255,255,0.32)] hover:brightness-105 active:scale-95"
                                    }`}
                            >
                                {isEventEnded ? "Event Ended" : (
                                    <>
                                        Pay Now
                                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>


            {/* ---------------- Desktop optimization (later, already ready) ---------------- */}
            <div className="hidden" />

            {/* ---------------- GIFT POPUPS ---------------- */}
            {/* 1. Unlock Popup */}
            {popupGift && !giftSelected[popupGift.id] && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setPopupGift(null)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <Close />
                        </button>

                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-4xl">
                            🎁
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-gray-900">
                            Gift Unlocked!
                        </h3>
                        <p className="mb-6 text-sm text-gray-600">
                            You&apos;ve unlocked <b>{popupGift.title.replace(/^FREE\s*/i, "")}</b>. <br />
                            Please claim the free gift by clicking on the claim button .
                        </p>

                        <div className="mx-auto mb-6 h-32 w-32 overflow-hidden rounded-xl shadow-md">
                            <img src={popupGift.image} alt={popupGift.title} className="h-full w-full object-cover" loading="lazy" />
                        </div>

                        <button
                            onClick={() => {
                                handleClaimGift(popupGift);
                                setPopupGift(null);
                            }}
                            className="w-full rounded-xl bg-gradient-to-r from-[#C93338] to-[#B21E24] px-6 py-3 text-[14px] font-black text-white transition-all hover:brightness-110 active:scale-95"
                        >
                            Claim Gift
                        </button>

                    </div>
                </div>
            )}

            {/* 2. Success/Claimed Popup */}
            {claimSuccessGift && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setClaimSuccessGift(null)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                        >
                            <Close />
                        </button>

                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
                            ✅
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-gray-900">
                            Added to Cart !
                        </h3>
                        <p className="mb-2 text-sm text-gray-600">
                            <b>{claimSuccessGift.title.replace(/^FREE\s*/i, "")}</b>  (₹0) has been added as a FREE GIFT. (will be shipped with your order)
                        </p>
                    </div>
                </div>
            )}

            {/* 2.5 Item Detail Popup */}
            {selectedItemForModal && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setSelectedItemForModal(null)}
                >
                    <div
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedItemForModal(null)}
                            className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/30"
                        >
                            <Close />
                        </button>

                        {/* Image Header */}
                        <div className={`relative w-full shrink-0 ${selectedItemForModal.type === 'combo' ? 'bg-[#B21E24]/[0.04]' : 'h-64'}`}>
                            {selectedItemForModal.type === 'combo' ? (
                                <img
                                    src={selectedItemForModal.itemImage?.location || selectedItemForModal.image}
                                    alt="Combo"
                                    className="w-full h-auto object-contain p-0 mix-blend-multiply max-h-[40vh]"
                                    loading="lazy"
                                />
                            ) : (
                                <img
                                    src={selectedItemForModal.image || selectedItemForModal.itemImage?.location}
                                    alt={selectedItemForModal.itemName || selectedItemForModal.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col flex-1 overflow-y-auto p-5">
                            <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">
                                {selectedItemForModal.itemName || selectedItemForModal.name || selectedItemForModal.title}
                            </h3>

                            {selectedItemForModal.type === 'combo' && selectedItemForModal.items && (
                                <p className="text-xs text-[#B21E24] mb-2 font-medium">
                                    Combo Pack
                                </p>
                            )}

                            <div className="text-sm text-slate-600 leading-relaxed space-y-2 mb-4">
                                {selectedItemForModal.itemDesc || selectedItemForModal.desc}
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 border-t bg-gray-50 flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                {selectedItemForModal.type === 'combo' && selectedItemForModal.mrp > selectedItemForModal.price && (
                                    <span className="text-xs text-slate-500 line-through">{money(selectedItemForModal.mrp)}</span>
                                )}
                                <span className="text-xl font-black text-[#B21E24]">
                                    <span className="notranslate">{money(selectedItemForModal.price || selectedItemForModal.itemPrice)}</span>
                                </span>
                            </div>

                            {(() => {
                                const id = selectedItemForModal.id;
                                const isCombo = selectedItemForModal.type === 'combo';
                                const qty = isCombo ? (selectedCombos[id] || 0) : (selectedSingles[id] || 0);

                                if (qty <= 0) {
                                    return (
                                        <button
                                            onClick={() => {
                                                if (isCombo) changeComboQty(id, 1);
                                                else changeQty(id, 1);
                                            }}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#C93338] to-[#B21E24] text-white font-bold text-sm shadow-lg shadow-[#B21E24]/25 active:scale-95 transition-transform"
                                        >
                                            Add to Cart
                                        </button>
                                    )
                                }

                                return (
                                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                                        <button
                                            onClick={() => isCombo ? changeComboQty(id, -1) : changeQty(id, -1)}
                                            className="w-8 h-8 flex items-center justify-center text-[#B21E24] font-black text-lg bg-[#B21E24]/[0.08] rounded-lg hover:bg-[#B21E24]/[0.15]"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center font-bold text-slate-900 notranslate">{qty}</span>
                                        <button
                                            onClick={() => isCombo ? changeComboQty(id, 1) : changeQty(id, 1)}
                                            className="w-8 h-8 flex items-center justify-center text-[#B21E24] font-black text-lg bg-[#B21E24]/[0.08] rounded-lg hover:bg-[#B21E24]/[0.15]"
                                        >
                                            +
                                        </button>
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}
            {/* 3. Prasad Popup */}
            {showPrasadPopup && (
                <div
                    className="fixed inset-0 z-[101] flex items-end justify-center bg-black/60 backdrop-blur-md transition-opacity"
                    onClick={() => setShowPrasadPopup(false)}
                >
                    <div
                        className="w-full md:w-1/2 h-auto bg-gradient-to-b from-[#F7ECE8] to-white rounded-t-3xl pt-2 pb-6 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle indicator */}
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

                        <div className="px-5">
                            <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-[#B21E24]/15">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#B21E24] rounded-xl blur-sm opacity-20 -z-10"></div>
                                    <img
                                        src={banners[0]?.image}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-[#B21E24]/15"
                                        alt={basePuja.title}
                                        loading="lazy"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                                        <VerifiedIcon sx={{ fontSize: 12 }} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-[#B21E24] mb-0.5">Selected Offering</div>
                                    <div className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{basePuja.title}</div>
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="font-black text-xl text-slate-900 mb-3">Complete Your Devotion 🙏</h3>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="inline-flex items-center gap-2 bg-[#B21E24]/[0.06] border border-[#B21E24]/20 rounded-full px-4 py-1.5">

                                        <span className="text-sm font-black text-[#B21E24]">96% of devotees add Sacred Prasad</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2 bg-[#B8860B]/10 border border-[#B8860B]/25 rounded-full px-4 py-1.5">

                                        <span className="text-xs font-bold text-[#8A6608]">Over 10,000+ Sacred Prasad opted by devotees</span>
                                    </div>
                                </div>
                            </div>

                            {/* ⚠️ PHYSICAL GOODS, HOME MARKET ONLY. Prasad is perishable — abroad it
                                either gets refused at customs or costs more to courier than the
                                whole order. Not offering it beats selling it and apologising. */}
                            {prasad && shipsPrasad() && (
                                <div className={`relative overflow-hidden flex items-center gap-4 p-4 mb-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${prasadSelected ? "bg-[#B21E24]/[0.06] border-[#B21E24] shadow-md shadow-[#B21E24]/10" : "bg-white border-slate-200 hover:border-[#B21E24]/40"}`}
                                    onClick={() => setPrasadSelected((p) => !p)}>

                                    {/* Selected Badge */}
                                    {prasadSelected && (
                                        <div className="absolute top-0 right-0 bg-[#B21E24] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                                            SELECTED
                                        </div>
                                    )}

                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 rounded-xl bg-[#B21E24]/10 overflow-hidden border border-[#B21E24]/20 shadow-inner">
                                            <img
                                                src={prasad.image}
                                                alt={prasad.name}
                                                className="w-full h-full object-cover transform scale-110"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-fit bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                                            <span className="notranslate">{money(prasad.price)}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 pr-6">
                                        <div className="font-bold text-slate-900 leading-tight mb-1 pr-2">{prasad.name}</div>
                                        <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{prasad.desc}</div>
                                    </div>

                                    {/* Custom Checkbox */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${prasadSelected ? "bg-[#B21E24] border-[#B21E24]" : "bg-slate-50 border-slate-300"}`}>
                                            {prasadSelected && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-3">
                                {/* Primary CTA - Massive & Highly Visible */}
                                <button
                                    className={`w-full py-4 rounded-xl font-black text-white text-base flex items-center justify-center gap-2 transition-all ${prasadSelected ? "bg-gradient-to-r from-[#C93338] to-[#B21E24] shadow-lg shadow-[#B21E24]/30 hover:shadow-[#B21E24]/50 scale-[1.02]" : "bg-slate-800 hover:bg-slate-900"}`}
                                    onClick={handleEnterPrasadDetails}
                                >
                                    {prasadSelected ? "Continue with Prasad" : "Add Prasad to Complete"}
                                    <ArrowForwardIos sx={{ fontSize: 16 }} />
                                </button>

                                {/* Secondary CTA - Bold dark skip option */}
                                <button
                                    className="text-xs font-bold text-black underline decoration-slate-300 underline-offset-4 hover:text-slate-600 pb-2 mx-auto"
                                    onClick={handleSkipPrasad}
                                >
                                    No thanks, I will skip the sacred prasad
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* 4. Empty Cart Modal (Modern Popup) */}
            {showEmptyCartModal && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setShowEmptyCartModal(false)}
                >
                    <div
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowEmptyCartModal(false)}
                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-2"
                        >
                            <Close />
                        </button>

                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#B21E24]/10 text-4xl shadow-sm">
                            🛒
                        </div>

                        <h3 className="mb-2 text-xl font-bold text-gray-900 leading-tight">
                            Your Sewa Cart is Empty
                        </h3>
                        <p className="mb-6 text-sm text-gray-600 leading-relaxed">
                            Please select a <b>Chadhava</b> or <b>Combo</b> to offer your sewa.
                        </p>

                        <button
                            onClick={() => setShowEmptyCartModal(false)}
                            className="w-full rounded-xl bg-gradient-to-r from-[#C93338] to-[#B21E24] px-6 py-3.5 text-[14px] font-black text-white transition-all shadow-lg hover:brightness-110 active:scale-95 hover:shadow-[#B21E24]/25"
                        >
                            Okay, Select Sewa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const NewChadhavaDetailPage = () => {
    useEffect(() => {
        captureVvUtm();
    }, []);

    return (
        <Layout content={<NewChadhavaDetailContent />} activeIndex="chadhava" />
    );
};

export default NewChadhavaDetailPage;
