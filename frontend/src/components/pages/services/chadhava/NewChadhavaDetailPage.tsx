"use client";

import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import Share from '@mui/icons-material/Share';
import Lock from '@mui/icons-material/Lock';
import Close from '@mui/icons-material/Close';
import ArrowForwardIos from '@mui/icons-material/ArrowForwardIos';
import VerifiedIcon from "@mui/icons-material/Verified";
import React, { useEffect, useMemo, useRef, useState, Fragment, lazy, memo } from "react";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";

import Layout from "@/components/layout/Layout";
import NewChadhavaContent from "./NewChadhavaContent";
import Loadinggif from "@/components/shared/LoadingGif";
import LazySection from "@/components/widgets/home/LazySection";
import { useNewChadhavaDetailQuery } from "@/hooks/queries/useNewChadhavaDetailQuery";
import { useMandirDetailQuery } from "@/hooks/queries/useMandirQueries";
import { gtag } from "@/lib/gtag";
import { useMoney, shipsPrasad, toInr } from "@/lib/currency";
import { captureVvUtm } from "@/lib/utm";
import { buildDetailSlug, extractIdFromSlug } from "@/lib/slug";
import { useMusic } from "@/components/widgets/music/MusicContext";

// Reviews sit at the very bottom and pull in antd's Carousel (react-slick) and
// framer-motion — kept out of the initial bundle and mounted near the viewport.
const ReviewPuja = lazy(() => import("@/components/widgets/puja/ReviewPuja"));

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

    return (
        <div className="bg-[#CA3500] text-center py-1.5 text-white  text-[13px] tracking-wide">
            <span className="notranslate">{timeLeft.days}</span> Days | <span className="notranslate">{timeLeft.hours}</span> Hrs | <span className="notranslate">{timeLeft.minutes}</span> Mins |{" "}
            <span className="notranslate">{timeLeft.seconds}</span> Sec
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
    const fallbackUrl =
        typeof m?.mandirAppImage === "string"
            ? m.mandirAppImage
            : m?.mandirAppImage?.location || m?.mandirAppImage?.url || "";

    // Tracked in state (rather than rewriting e.currentTarget.src) so the
    // fallback also works through next/image.
    const [imgSrc, setImgSrc] = useState(imageUrl);
    useEffect(() => setImgSrc(imageUrl), [imageUrl]);

    if (!m) return null;

    const aboutHtml = m?.mandirSectionIntro || "";
    const historyHtml = m?.mandirSectionHistory || "";

    return (
        <section className="mx-3 mt-3 mb-3 overflow-hidden rounded-2xl border border-blue-100 bg-sky-50 shadow-sm">
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
                    {imgSrc ? (
                        // Resized by next/image: the source is a ~1.6MB JPEG for a 192px-tall box.
                        <div className="relative mb-4 h-48 overflow-hidden rounded-xl">
                            <Image
                                src={imgSrc}
                                alt={m.nameEnglish || "Mandir"}
                                fill
                                sizes="(max-width: 430px) 90vw, 400px"
                                className="object-cover"
                                onError={() =>
                                    setImgSrc(fallbackUrl && imgSrc !== fallbackUrl ? fallbackUrl : "")
                                }
                            />
                        </div>
                    ) : null}

                    {/* Tabs */}
                    <div className="mb-4 flex gap-3">
                        <button
                            onClick={() => setSelectedTab("about")}
                            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors ${selectedTab === "about"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                }`}
                        >
                            About
                        </button>
                        <button
                            onClick={() => setSelectedTab("history")}
                            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors ${selectedTab === "history"
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
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

/**
 * Hero banner carousel.
 *
 * Owns its own slide state: the 3.5s autoplay used to live in the page
 * component, so every tick re-rendered the whole ~1900-line page tree.
 *
 * The first slide is the LCP element, so it is fetched eagerly at high
 * priority and served through next/image (resized, AVIF/WebP) instead of the
 * full-size original with loading="lazy". Later slides mount only once they are
 * next up, so their bytes stay off the initial load.
 */
const BannerCarousel = memo(({ banners, rating, reviewCount }: {
    banners: Banner[];
    rating: number;
    reviewCount: number;
}) => {
    const [activeBanner, setActiveBanner] = useState(0);
    const [mounted, setMounted] = useState<Set<number>>(() => new Set([0, 1]));

    useEffect(() => {
        if (banners.length < 2) return;
        const timer = window.setInterval(() => {
            setActiveBanner((p) => (p + 1) % banners.length);
        }, 3500);
        return () => window.clearInterval(timer);
    }, [banners.length]);

    // Pre-mount the slide after the active one so it has loaded before it shows.
    useEffect(() => {
        if (!banners.length) return;
        const upcoming = [activeBanner, (activeBanner + 1) % banners.length];
        setMounted((prev) => (upcoming.every((i) => prev.has(i)) ? prev : new Set([...prev, ...upcoming])));
    }, [activeBanner, banners.length]);

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

    return (
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
                            // Space is reserved before the image arrives: chadhava banners
                            // are uploaded at 50:27 (500x270, 750x405, 1250x675…). Sizing
                            // from the image itself let the whole page below jump down
                            // once it loaded (CLS 0.21). An off-ratio upload letterboxes
                            // on the black background instead of shifting the layout.
                            "aspect-[50/27] transition-opacity duration-500 will-change-opacity",
                            idx === activeBanner ? "relative opacity-100" : "absolute inset-0 opacity-0",
                        ].join(" ")}
                        aria-hidden={idx !== activeBanner}
                    >
                        {b.image && (idx === activeBanner || mounted.has(idx)) ? (
                            <Image
                                src={b.image}
                                alt="Chadhava"
                                fill
                                sizes="(max-width: 430px) 100vw, 430px"
                                priority={idx === 0}
                                className="object-contain"
                            />
                        ) : null}
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
    );
});

BannerCarousel.displayName = "BannerCarousel";

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
        // Coalesced to one layout read per frame — reading scrollHeight on every
        // scroll event forced a synchronous reflow each time.
        let frame = 0;
        const update = () => {
            frame = 0;
            const scrollY = window.scrollY;
            const maxScroll = document.body.scrollHeight - window.innerHeight;
            if (maxScroll <= 0) { setScrollDir('none'); return; }
            const pct = scrollY / maxScroll;
            if (pct > 0.82) setScrollDir('up');        // scrolled past 12% — show up arrow
            else setScrollDir('down');                  // still near top — show down arrow
        };
        const onScroll = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (frame) cancelAnimationFrame(frame);
        };
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

    /* ------------------------------ HANDLERS ------------------------------ */
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
            // Confetti effect — loaded on first claim, not with the page
            void import("canvas-confetti").then(({ default: confetti }) =>
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 9999,
                })
            );

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
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes slideDown {
  0% { opacity: 0; transform: translate(-50%, -100%); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes scrollFloat {
  0%, 100% { transform: translateY(0); opacity: 0.95; }
  50% { transform: translateY(-7px); opacity: 1; }
}
`;

    /* ------------------------------ RENDER ------------------------------ */
    if (loading) return <Loadinggif />;
    if (!apiData) return <Loadinggif />;

    return (
        <div className="min-h-screen font-sans text-[#141414]">
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
                    <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center shadow-[0_4px_14px_rgba(202,53,0,0.35)]">
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
                <BannerCarousel banners={banners} rating={rating} reviewCount={reviewCount} />

                {/* ---------------- Title + share ---------------- */}
                <section className="mx-3 mt-3 ">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="text-[16px] font-semibold font-sans leading-snug">
                                {chadhavaName}
                            </h1>
                            <div className="mt-1 text-[12px] text-black/60">🛕 {mandirName}</div>
                            <div className="mt-1 flex items-center text-black/60 gap-2 text-[12px] text-gray-500">
                                <span>📅</span>
                                <span>{formatChadhavaDate(chadhavaDate)}</span>
                            </div>
                        </div>

                        <button
                            onClick={shareChadhava}
                            title="Share"
                            className="grid h-10 w-10 shrink-0 text-orange-400 bg-orange-100 border-orange-300 place-items-center rounded-xl border border-black/10 "
                        >
                            <span className="text-[16px]"><Share /></span>
                        </button>
                    </div>



                    {/* Featured On Text */}
                    <div className=" text-center">
                        <span
                            // Transform-only animation stays on the compositor; the glow used to be
                            // an animated filter, which repainted every frame on the main thread.
                            style={{ animation: "pop 2s ease-in-out infinite", boxShadow: "0 0 6px rgba(202, 53, 0, 0.35)" }}
                            className="inline-block rounded-full bg-gradient-to-r from-orange-50 to-orange-100 px-4 py-1 text-[8px] font-extrabold tracking-wide text-[#CA3500] ring-1 ring-[#CA3500]/20"
                        >
                            Featured on 200+ News Portals
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

                </section>




                {/* ---------------- Name & Gotra ---------------- */}
                <section className="mx-3 mt-2  ">
                    <div className="text-[15px] ">
                        Chadhava Offered in your Name & Gotra
                    </div>
                    <div className=" text-[10px]  text-green-500">
                        Receive chadhava video 📱 + with your name and gotra on WhatsApp
                    </div>
                </section>





                <div className="space-y-1 bg-[#white] pb-3">

                    {/* ---------------- Free gifts (above chadhava listing) ---------------- */}
                    {giftTiers.length > 0 && (
                        <section className="mx-3 mt-3">
                            <div className="mt-3 flex gap-3 overflow-x-auto pb-2 pr-2 [-webkit-overflow-scrolling:touch]">
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
                                            <div className="flex flex-1 gap-3 p-3">
                                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-gray-100">
                                                    <Image src={g.image} alt={g.title} fill sizes="48px" className="object-cover" />
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
                                <section ref={secIdx === 0 ? scrollTargetRef : undefined} className=" mt-3 overflow-hidden rounded-2xl bg-[#CA3500] shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
                                    {/* header */}
                                    <div className="flex items-center gap-2 px-3 py-2 text-white">
                                        <span className="text-[14px]">🪔</span>
                                        <div className="text-[17px] font-semibold">{section.sectionName}</div>
                                        <div className="ml-2 h-[2px] flex-1 rounded-full bg-white/60" />
                                        <div className="flex items-center gap-1">
                                            <span className="h-[4px] w-[4px] rounded-full bg-white" />
                                            <span className="h-[4px] w-[4px] rounded-full bg-white/80" />
                                            <span className="h-[4px] w-[4px] rounded-full bg-white/60" />
                                        </div>
                                    </div>

                                    {/* body */}
                                    <div className="rounded-2xl bg-[#CA3500] px-3 pb-3 ">
                                        {/* single items scroll (shown first, above combos) */}
                                        {sectionItems.length > 0 && (
                                            <div className={`flex bg-white rounded-2xl p-2 mb-3 gap-3 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-fit mx-auto max-w-full overflow-x-auto ${sectionItems.length > 3 ? "pr-4" : ""}`}>
                                                {sectionItems.map((it: any) => {
                                                    const id = it.itemName; // Use itemName as ID
                                                    const image = it.itemImage?.location || "";
                                                    const price = it.itemPrice;
                                                    const qty = selectedSingles[id] ?? 0;

                                                    return (

                                                        <div key={id} className="w-[118px] shrink-0" onClick={() => setSelectedItemForModal({ ...it, type: 'single', id })}>
                                                            <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-square">
                                                                {/* Was a CSS background of the full-size original for a 118px tile. */}
                                                                {image ? (
                                                                    <Image
                                                                        src={image}
                                                                        alt={it.itemName || "Chadhava item"}
                                                                        fill
                                                                        sizes="118px"
                                                                        className="object-cover object-center"
                                                                    />
                                                                ) : null}

                                                                {/* ADD / qty button on image */}
                                                                {qty <= 0 ? (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); changeQty(id, +1); }}
                                                                        className="absolute bottom-2 right-2 rounded-md bg-[#CA3500] px-2 py-1 text-[11px] font-semibold text-white shadow"
                                                                    >
                                                                        ADD
                                                                    </button>
                                                                ) : (
                                                                    <div className="absolute bottom-2 right-2 flex items-center overflow-hidden rounded-md bg-white shadow" onClick={(e) => e.stopPropagation()}>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); changeQty(id, -1); }}
                                                                            className="px-2 py-1 text-[12px] font-black text-[#CA3500]"
                                                                            aria-label="Decrease"
                                                                        >
                                                                            −
                                                                        </button>
                                                                        <div className="px-2 py-1 text-[11px] font-black notranslate">{qty}</div>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); changeQty(id, +1); }}
                                                                            className="px-2 py-1 text-[12px] font-black text-[#CA3500]"
                                                                            aria-label="Increase"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="mt-2 text-[12px] font-semibold leading-tight text-black/90">
                                                                {it.itemName}
                                                            </div>
                                                            <div className="mt-0.5 overflow-hidden text-[10px] leading-snug text-gray-500 line-clamp-2">
                                                                {it.itemDesc}
                                                            </div>
                                                            <div className="mt-1 text-[13px] font-black text-emerald-700 notranslate">{money(price)}</div>
                                                        </div>

                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* combo cards (shown after singles) */}
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
                                            return (
                                                <div key={id} className="mb-3 overflow-hidden rounded-2xl bg-[#FFEDD4]" onClick={() => setSelectedItemForModal({ ...c, type: 'combo', id, price, mrp })}>
                                                    <div className="flex items-center gap-2 px-3 py-2">

                                                        <div className="rounded-md bg-[#E6AB59]  p-2  text-[11px] font-semibold text-white">
                                                            <span className="rounded-md bg-red-500 px-2 py-1  text-[11px] font-semibold text-white">
                                                                {badgeText}
                                                            </span>
                                                            <span className="ms-1">Add all to save more</span>
                                                        </div>
                                                    </div>

                                                    {/* wide image */}
                                                    <div className="px-3">
                                                        <div className="relative h-32 w-full overflow-hidden rounded-xl shadow-sm">
                                                            {c.itemImage?.location ? (
                                                                <Image
                                                                    src={c.itemImage.location}
                                                                    alt={c.itemName || "Chadhava combo"}
                                                                    fill
                                                                    sizes="(max-width: 430px) 90vw, 400px"
                                                                    className="object-cover object-center"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    {/* title + price + add */}
                                                    <div className="px-3 pb-3 pt-3">
                                                        <div className="text-[13px] font-semibold leading-tight text-black/90">
                                                            {c.itemName}
                                                        </div>
                                                        <div className="text-[10px] text-black/60 mt-1 line-clamp-2">
                                                            {c.itemDesc}
                                                        </div>

                                                        <div className="mt-2 flex items-center justify-between gap-3">
                                                            <div className="flex items-baseline gap-2">
                                                                <span className="text-[11px] text-gray-500 line-through">{money(mrp)}</span>
                                                                <span className="text-[14px] font-black text-emerald-700 notranslate">{money(price)}</span>
                                                            </div>

                                                            {qty <= 0 ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); changeComboQty(id, +1); }}
                                                                    className="rounded-xl bg-[#CA3500] px-4 py-2 text-[12px] font-semibold text-white shadow"
                                                                >
                                                                    ADD ALL
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-2 rounded-xl border border-orange-500/25 bg-white/50 px-2 py-1" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); changeComboQty(id, -1); }}
                                                                        className="grid h-[24px] w-[24px] place-items-center rounded-lg border border-black/10 bg-white text-[14px] font-black text-[#CA3500]"
                                                                    >
                                                                        −
                                                                    </button>
                                                                    <div className="w-4 text-center text-[12px] font-black notranslate">{qty}</div>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); changeComboQty(id, +1); }}
                                                                        className="grid h-[24px] w-[24px] place-items-center rounded-lg border border-black/10 bg-white text-[14px] font-black text-[#CA3500]"
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
                                    className="whitespace-nowrap rounded-full border border-dashed border-orange-700 text-black/70 px-3 py-1.5 text-[12px] "
                                >
                                    {t.text}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                <button
                    onClick={() => setDetailsOpen((p) => !p)}
                    className="mt-1 flex w-full items-center text-white justify-between gap-3 rounded-2xl border border-black/10 bg-gradient-to-b from-[#CA3500] to-[#FC6000] px-3 py-2"
                >
                    <span className="flex items-center gap-2 text-[13px] ">

                        Chadhava Details
                    </span>
                    <span className="text-white">
                        {detailsOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </span>
                </button>

                {/* dropdown content */}
                <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${detailsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                >
                    <div className="overflow-hidden">
                        <div className="mt-3 whitespace-pre-line rounded-2xl border border-dashed border-black/15 bg-white p-3 text-[12px] leading-relaxed text-black/80">
                            {chadhavaDetailsText}
                        </div>
                    </div>
                </div>

                {/* ---------------- Mandir Details ---------------- */}
                <MandirDetailsSection mandir={mandirLive ?? apiData?.selectedMandirs?.[0]} />

                {/* ---------------- Why Perform & What You Get ---------------- */}
                <NewChadhavaContent />
                <LazySection placeholderHeight={600} name="chadhava-reviews">
                    <ReviewPuja />
                </LazySection>
                {/* Spacer to separate content from footer bar when at bottom */}
                <div className="pb-0"></div>

                {/* ---------------- Sticky bottom bar ---------------- */}
                <div className="sticky bottom-0 z-50 w-full overflow-hidden shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    {/* Timer Bar - Counts down to end of the chadhava date to keep active on that day */}
                    {targetDate ? (
                        <CountdownTimer targetDate={targetDate} />
                    ) : (
                        /* Loading Skeleton for Timer */
                        <div className="flex h-[42px] w-full items-center justify-center bg-[#D33D08] px-4">
                            <div className="h-6 w-48 animate-pulse rounded bg-white/20" />
                        </div>
                    )}

                    {/* Main Footer Content */}
                    <div className="border-t border-black/10 bg-[#FAE9DA]/95 px-4 py-3 backdrop-blur">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[12px] font-medium text-gray-600">Your Chadhava</div>
                                <div className="text-[18px] font-black text-[#D33D08]">
                                    <span className="notranslate">{formatINR(totalAmount)}</span>/-
                                </div>
                            </div>

                            <button
                                onClick={handleParticipate}
                                disabled={isEventEnded}
                                className={`rounded-xl px-6 py-3 text-[14px] font-black text-white transition-all ${isEventEnded
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#F25F18] hover:bg-[#d84e0d] active:scale-95"
                                    }`}
                            >
                                {isEventEnded ? "EVENT ENDED" : "PAY NOW"}
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
                            className="w-full rounded-xl bg-[#F25F18] px-6 py-3 text-[14px] font-black text-white transition-all hover:bg-[#d84e0d] active:scale-95"
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
                        <div className={`relative w-full shrink-0 ${selectedItemForModal.type === 'combo' ? 'bg-orange-50/30' : 'h-64'}`}>
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
                                <p className="text-xs text-orange-600 mb-2 font-medium">
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
                                <span className="text-xl font-black text-emerald-700">
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
                                            className="px-6 py-3 rounded-xl bg-[#CA3500] text-white font-bold text-sm shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                                        >
                                            Add to Cart
                                        </button>
                                    )
                                }

                                return (
                                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                                        <button
                                            onClick={() => isCombo ? changeComboQty(id, -1) : changeQty(id, -1)}
                                            className="w-8 h-8 flex items-center justify-center text-[#CA3500] font-black text-lg bg-orange-50 rounded-lg hover:bg-orange-100"
                                        >
                                            −
                                        </button>
                                        <span className="w-6 text-center font-bold text-slate-900 notranslate">{qty}</span>
                                        <button
                                            onClick={() => isCombo ? changeComboQty(id, 1) : changeQty(id, 1)}
                                            className="w-8 h-8 flex items-center justify-center text-[#CA3500] font-black text-lg bg-orange-50 rounded-lg hover:bg-orange-100"
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
                        className="w-full md:w-1/2 h-auto bg-gradient-to-b from-orange-50 to-white rounded-t-3xl pt-2 pb-6 px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300 relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle indicator */}
                        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 opacity-70" />

                        <div className="px-5">
                            <div className="flex items-center gap-4 mb-6 bg-white p-3 rounded-2xl shadow-sm border border-orange-100/50">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-500 rounded-xl blur-sm opacity-20 -z-10"></div>
                                    <img
                                        src={banners[0]?.image}
                                        className="w-14 h-14 rounded-xl object-cover border-2 border-orange-100"
                                        alt={basePuja.title}
                                        loading="lazy"
                                    />
                                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                                        <VerifiedIcon sx={{ fontSize: 12 }} />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 mb-0.5">Selected Offering</div>
                                    <div className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">{basePuja.title}</div>
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h3 className="font-black text-xl text-slate-900 mb-3">Complete Your Devotion 🙏</h3>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5">

                                        <span className="text-sm font-black text-orange-700">96% of devotees add Sacred Prasad</span>
                                    </div>
                                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">

                                        <span className="text-xs font-bold text-amber-700">Over 10,000+ Sacred Prasad opted by devotees</span>
                                    </div>
                                </div>
                            </div>

                            {/* ⚠️ PHYSICAL GOODS, HOME MARKET ONLY. Prasad is perishable — abroad it
                                either gets refused at customs or costs more to courier than the
                                whole order. Not offering it beats selling it and apologising. */}
                            {prasad && shipsPrasad() && (
                                <div className={`relative overflow-hidden flex items-center gap-4 p-4 mb-6 border-2 rounded-2xl transition-all duration-300 cursor-pointer ${prasadSelected ? "bg-orange-50 border-orange-500 shadow-md shadow-orange-100" : "bg-white border-slate-200 hover:border-orange-300"}`}
                                    onClick={() => setPrasadSelected((p) => !p)}>

                                    {/* Selected Badge */}
                                    {prasadSelected && (
                                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                                            SELECTED
                                        </div>
                                    )}

                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 rounded-xl bg-orange-100 overflow-hidden border border-orange-200 shadow-inner">
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
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${prasadSelected ? "bg-orange-500 border-orange-500" : "bg-slate-50 border-slate-300"}`}>
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
                                    className={`w-full py-4 rounded-xl font-black text-white text-base bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center gap-2 ${prasadSelected ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-orange-500/30 hover:shadow-orange-500/50 scale-[1.02]" : "bg-slate-800 hover:bg-slate-900"}`}
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

                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-4xl shadow-sm">
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
                            className="w-full rounded-xl bg-[#F25F18] px-6 py-3.5 text-[14px] font-black text-white transition-all shadow-lg hover:bg-[#d84e0d] active:scale-95 hover:shadow-orange-200"
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
