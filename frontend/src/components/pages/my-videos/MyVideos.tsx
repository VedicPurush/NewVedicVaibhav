"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Layout from "@/components/layout/Layout";
import ServiceVideoModal from "@/components/shared/ServiceVideoModal";
import { useServiceVideosQuery, type ServiceVideo } from "@/hooks/queries/useServiceVideosQuery";
import { parseVideoLink } from "@/lib/videoLinkParser";

/** India-only, matching every other phone field on the site. */
const isValidPhone = (digits: string) => /^[6-9]\d{9}$/.test(digits);

/** Prefill for a devotee who is already signed in — most arrivals are. */
const readStoredPhone = (): string => {
  try {
    const raw = JSON.parse(localStorage.getItem("userDetails") || "{}")?.user?.phone;
    return raw ? String(raw).replace(/\D/g, "").slice(-10) : "";
  } catch {
    return "";
  }
};

const formatDate = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(d);
};

const serviceLabel = (service: string): string =>
  service === "puja" ? "Puja" : service === "chadhava" ? "Chadhava" : service;

/* ─── How it works ─────────────────────────────────────────────────────────── */

const STEPS = [
  {
    title: "Enter your booking number",
    body: "Use the same mobile number you gave while booking your chadhava or puja. That is what your video is filed under.",
  },
  {
    title: "See every video sent to you",
    body: "All your videos appear together, newest first, with the puja name and the temple it was recorded at.",
  },
  {
    title: "Watch, or save it forever",
    body: "Tap any video to play it here. Use “Open in Google Drive” to watch full screen, download it, or share it with your family.",
  },
];

const FAQS = [
  {
    q: "When will my video be ready?",
    a: "Your video is recorded on the day of the ritual and uploaded once our team at the temple has finished. This usually takes a few days after the puja date. Until then this page will show no video for your booking — that is normal, and nothing has gone wrong.",
  },
  {
    q: "I booked, but no video is showing.",
    a: "Two things are worth checking first. Make sure you entered the exact number you booked with — a video filed under a different number will not appear here. And check the puja date: if the ritual has not happened yet, or happened very recently, the video may not be uploaded. If the date has well passed and you still see nothing, contact us with your Order ID.",
  },
  {
    q: "Can I download my video or send it to family?",
    a: "Yes. Open any video and tap “Open in Google Drive”. From there you can play it full screen, download it to your phone, or share the link with anyone you like.",
  },
  {
    q: "The video will not play.",
    a: "This is almost always a slow connection — the player needs a moment to load. If it still does not start, tap “Open in Google Drive”, which plays the file directly and works on every device.",
  },
  {
    q: "Where else can I find my videos?",
    a: "If you are signed in, your videos also appear on each booking under Profile This page exists so you can reach them without signing in at all.",
  },
];

/* ─── Video card ───────────────────────────────────────────────────────────── */

const VideoCard: React.FC<{ video: ServiceVideo; onPlay: () => void }> = ({ video, onPlay }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const parsed = parseVideoLink(video.videoUrl, video.pujaTitle || "Your video");
  const title = video.pujaTitle || `${serviceLabel(video.service)} Video`;
  const date = formatDate(video.pujaDate) || formatDate(video.createdAt);

  return (
    <button
      type="button"
      onClick={onPlay}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-black/5
                 shadow-sm hover:shadow-lg transition-shadow focus:outline-none
                 focus:ring-2 focus:ring-orange-500 w-full"
    >
      {/* Portrait frame, because that is how these reels are shot. */}
      <div className="relative w-full bg-neutral-900" style={{ aspectRatio: "3 / 4" }}>
        {parsed.thumbUrl && !imgFailed ? (
          <img
            loading="lazy"
            src={parsed.thumbUrl}
            alt=""
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#7A0F1F] to-[#C2410C]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wide
                     bg-white/90 text-[#7A0F1F] px-2 py-0.5 rounded-full"
        >
          {serviceLabel(video.service)}
        </span>

        <span
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/25 backdrop-blur-sm
                     border border-white/50 flex items-center justify-center
                     group-hover:scale-105 transition-transform"
        >
          <svg className="w-6 h-6 text-white translate-x-[2px]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>

        {date && (
          <span className="absolute bottom-2.5 left-3 right-3 text-white/90 text-[11px]">{date}</span>
        )}
      </div>

      <div className="p-3.5">
        <div className="font-semibold text-[13.5px] leading-snug text-neutral-900 line-clamp-2">
          {title}
        </div>
        {video.temple && (
          <div className="text-[12px] text-neutral-500 mt-1 line-clamp-2">{video.temple}</div>
        )}
        <div className="text-[10.5px] text-neutral-400 mt-2 break-all">
          Order ID: {video.orderId || "N/A"}
        </div>
      </div>
    </button>
  );
};

/* ─── Page ─────────────────────────────────────────────────────────────────── */

const MyVideos = () => {
  const [phone, setPhone] = useState("");
  /** Only set on submit, so typing does not fire a lookup per keystroke. */
  const [submitted, setSubmitted] = useState("");
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<ServiceVideo | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  /**
   * Prefill runs after hydration, by which time a fast devotee on a slow phone
   * may already be typing — so it fills the field, it never replaces it. A
   * plain `setPhone(stored)` wiped those first keystrokes.
   */
  useEffect(() => {
    const stored = readStoredPhone();
    if (stored) setPhone((typed) => typed || stored);
  }, []);

  const { videos, isFetching, isError } = useServiceVideosQuery(submitted || undefined, "all");
  const searching = Boolean(submitted) && isFetching;
  const hasSearched = Boolean(submitted) && !isFetching && !isError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError("Please enter the 10-digit mobile number you booked with.");
      return;
    }
    setError("");
    setSubmitted(phone);
    /* The hero and the form fill a phone screen, so results land below the fold
       and a devotee who found nothing on screen concludes the search failed.
       Safe to scroll immediately: the skeletons below give the area height
       straight away, so this never jumps past an empty box into the guide. */
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const content = (
    <div className="bg-[#FFF8F0] min-h-screen pb-16">
      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#7A0F1F] to-[#C2410C] px-4 pt-7 sm:pt-9 pb-20 text-center">
        <h1 className="text-white text-[22px] sm:text-[30px] font-bold leading-tight max-w-2xl mx-auto">
          Watch Your Seva Videos
        </h1>
        <p className="text-white/80 text-[13px] sm:text-[15px] mt-2.5 max-w-xl mx-auto leading-relaxed">
          Every chadhava and puja we perform is recorded for you at the temple. Enter the mobile
          number you booked with to see yours.
        </p>
      </div>

      {/* ── Lookup form ─────────────────────────────────────────────────────── */}
      <div className="px-4 -mt-12">
        <form
          onSubmit={handleSubmit}
          className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg border border-black/5 p-5 sm:p-6"
        >
          <label htmlFor="vv-phone" className="block text-[13px] font-semibold text-neutral-800">
            Your booking mobile number
          </label>

          <div className="flex gap-2 mt-2.5">
            <span className="shrink-0 inline-flex items-center px-3 rounded-xl bg-neutral-100 text-neutral-600 text-[14px] font-medium">
              +91
            </span>
            <input
              id="vv-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              className="flex-1 min-w-0 rounded-xl border border-neutral-200 px-3.5 py-2.5 text-[15px]
                         tracking-wide outline-none focus:border-[#C2410C] focus:ring-1 focus:ring-[#C2410C]"
            />
          </div>

          {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}

          <button
            type="submit"
            disabled={searching}
            className="mt-4 w-full rounded-xl py-3 text-white font-semibold text-[14.5px]
                       bg-gradient-to-br from-[#7A0F1F] to-[#C2410C]
                       disabled:opacity-60 active:scale-[0.99] transition-transform"
          >
            {searching ? "Looking for your videos…" : "Show My Videos"}
          </button>

          <p className="text-[11.5px] text-neutral-400 mt-3 text-center">
            No login needed. We only use this number to find your bookings.
          </p>
        </form>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {/* scroll-mt clears the fixed header, which would otherwise sit over the
          heading we just scrolled to. */}
      <div ref={resultsRef} className="px-4 mt-8 max-w-5xl mx-auto scroll-mt-28">
        {searching && (
          <>
            <div className="h-5 w-40 rounded bg-black/10 animate-pulse" />
            <div className="h-3.5 w-56 rounded bg-black/5 animate-pulse mt-2 mb-4" />
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white border border-black/5">
                  <div className="w-full bg-black/10 animate-pulse" style={{ aspectRatio: "3 / 4" }} />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3.5 rounded bg-black/10 animate-pulse" />
                    <div className="h-3 w-2/3 rounded bg-black/5 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {isError && Boolean(submitted) && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
            <p className="text-[14px] font-semibold text-red-800">We could not load your videos.</p>
            <p className="text-[12.5px] text-red-700/80 mt-1">
              Please check your connection and tap “Show My Videos” again.
            </p>
          </div>
        )}

        {hasSearched && videos.length > 0 && (
          <>
            <h2 className="text-[16px] font-semibold text-neutral-800">
              {videos.length} {videos.length === 1 ? "video" : "videos"} found
            </h2>
            <p className="text-[12.5px] text-neutral-500 mt-0.5 mb-4">
              Tap any video to watch it. Newest first.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} onPlay={() => setPlaying(video)} />
              ))}
            </div>
          </>
        )}

        {hasSearched && videos.length === 0 && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm">
            <div className="text-4xl">🪔</div>
            <p className="text-[15px] font-semibold text-neutral-800 mt-3">
              No videos for this number yet
            </p>
            <p className="text-[13px] text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
              If your puja was performed only recently, the video may still be with our temple team.
              It is also worth checking that this is the exact number you booked with.
            </p>
            <Link
              href="/contactus"
              className="inline-block mt-4 text-[13px] font-semibold text-[#C2410C] underline underline-offset-4"
            >
              Contact us with your Order ID
            </Link>
          </div>
        )}
      </div>

      {/* ── Guide ───────────────────────────────────────────────────────────── */}
      <div className="px-4 mt-12 max-w-3xl mx-auto">
        <h2 className="text-[18px] font-bold text-neutral-900 text-center">How this page works</h2>

        <div className="grid sm:grid-cols-3 gap-3.5 mt-5">
          {STEPS.map((step, i) => (
            <div key={step.title} className="bg-white rounded-2xl border border-black/5 p-4 shadow-sm">
              <span className="inline-flex w-7 h-7 rounded-full bg-[#7A0F1F] text-white text-[12px] font-bold items-center justify-center">
                {i + 1}
              </span>
              <div className="font-semibold text-[13.5px] text-neutral-900 mt-2.5">{step.title}</div>
              <p className="text-[12.5px] text-neutral-500 mt-1.5 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <h2 className="text-[18px] font-bold text-neutral-900 text-center mt-10">
          Questions devotees ask
        </h2>

        <div className="mt-4 space-y-2.5">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="group bg-white rounded-2xl border border-black/5 shadow-sm px-4 py-3.5"
            >
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-[13.5px] font-semibold text-neutral-900">
                {faq.q}
                <span className="shrink-0 text-[#C2410C] transition-transform group-open:rotate-45 text-[18px] leading-none">
                  +
                </span>
              </summary>
              <p className="text-[12.5px] text-neutral-600 mt-2.5 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {playing && (
        <ServiceVideoModal
          open
          onClose={() => setPlaying(null)}
          videoUrl={playing.videoUrl}
          title={playing.pujaTitle || `Your ${serviceLabel(playing.service)} Video`}
        />
      )}
    </div>
  );

  return <Layout content={content} />;
};

export default MyVideos;
