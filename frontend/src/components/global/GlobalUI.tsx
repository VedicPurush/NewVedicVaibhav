"use client";

import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureReferralCode } from "@/lib/referral";
import AppDownloadModal from "@/components/shared/AppDownloadModal";
import GlobalBackgroundMusic from "@/components/widgets/music/GlobalBackgroundMusic";
import OfferPopup from "./OfferPopup";

declare global {
  interface Window {
    googleTranslateElementInit2?: () => void;
  }
}

/** Everything the old App.tsx/main.tsx did once, globally — analytics, referral capture,
 *  Google Translate bootstrap, scroll restoration and the site-wide popups. */
function GlobalUIInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Set only by a back/forward (popstate); a null here means the navigation was a
  // forward one and the incoming page should open at the top.
  const pendingScrollPosition = useRef<{ x: number; y: number } | null>(null);
  // null until the first client render, to tell a fresh page load apart from a
  // client-side route change.
  const previousPathname = useRef<string | null>(null);

  const searchString = searchParams.toString();
  const search = searchString ? `?${searchString}` : "";

  // Saved-language googtrans cookie + Google Translate re-apply on startup.
  useEffect(() => {
    const langNameToCode: Record<string, string> = {
      English: "en", Hindi: "hi", Gujarati: "gu", Telugu: "te", Marathi: "mr",
      Bengali: "bn", Tamil: "ta", Malayalam: "ml", Kannada: "kn", Punjabi: "pa",
      Odia: "or", Assamese: "as", Urdu: "ur", Sindhi: "sd", Nepali: "ne",
      Maithili: "mai", Sanskrit: "sa",
    };

    const savedLangName = localStorage.getItem("vv_selected_language");
    const langCode = (savedLangName && langNameToCode[savedLangName]) || "en";
    const domain = window.location.hostname.includes("localhost")
      ? "localhost"
      : window.location.hostname;

    // Set the googtrans cookie to the saved language (or English if none saved)
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${domain};`;

    // If a non-English language is saved, re-apply Google Translate on startup
    if (langCode !== "en") {
      const tryApply = (attempts = 30, interval = 200) => {
        if ((window as any).doGTranslate) {
          try {
            (window as any).doGTranslate(`en|${langCode}`);
          } catch {
            // ignore — the widget retries on its own
          }
          return;
        }
        if (attempts > 0) setTimeout(() => tryApply(attempts - 1, interval), interval);
      };
      setTimeout(() => tryApply(), 800); // wait for Google Translate script
    }
  }, []);

  /**
   * There is deliberately NO manual page_view here — do not add one back.
   *
   * GA4 already sends exactly one page_view per page, from two mechanisms that
   * between them cover every case:
   *   - `gtag('config', G-…)` sends the page_view for the initial load.
   *   - Enhanced Measurement ("Page changes based on browser history events",
   *     enabled on the property) sends one for every client-side route change.
   *
   * This effect used to send its own on top of both, so every page_view was
   * counted twice — pageviews inflated ~2x, pages-per-session doubled, and
   * engagement rate distorted. Measured on production: 2 beacons per landing and
   * 2 per SPA navigation; with this call removed, exactly 1 each.
   *
   * If Enhanced Measurement is ever turned off in the GA4 property, SPA route
   * changes stop being counted and a manual page_view has to come back — but it
   * must then also set `send_page_view: false` on the config in DeferredTags,
   * and be ordered AFTER that config. Events pushed to dataLayer before the
   * config are dropped by gtag.js, which is easy to hit because these tags are
   * deferred until first interaction.
   */

  // Capture partner/affiliate ?ref= codes on every route change so in-app SPA
  // navigations carrying a ?ref= are attributed too (not just full page loads).
  useEffect(() => {
    captureReferralCode(search);
  }, [search]);

  // Scroll policy for client-side navigation. `history.scrollRestoration` is
  // taken off the browser (see below), so nothing moves the viewport unless this
  // code does — which means all three cases have to be handled here:
  //
  //   - a different route          → open the page at the very top
  //   - back / forward             → return to where the user was on that entry
  //   - same route, query changed  → leave the scroll position alone (filters,
  //                                  tabs, pagination)
  //
  // This used to carry the outgoing position forward onto EVERY navigation, so a
  // link clicked from halfway down one page opened the next page halfway down.
  // Around twenty pages had grown their own `window.scrollTo(0, 0)` on mount to
  // paper over it; those are gone now, so this is the single place that decides
  // where a page opens. Page-level scrolling that survives is deliberate UI —
  // back-to-top buttons, scroll-to-first-error on failed form submits — not
  // navigation policy, and belongs where it is.
  useEffect(() => {
    const history = window.history;
    const positions = new Map<string, { x: number; y: number }>();
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    let currentUrl = window.location.href;

    history.scrollRestoration = "manual";

    const currentPosition = () => ({ x: window.scrollX, y: window.scrollY });
    const saveCurrentPosition = () => positions.set(currentUrl, currentPosition());

    // Both of these only record where the user was leaving from, for the back
    // button. Where the INCOMING page lands is decided by the layout effect below.
    history.pushState = function (...args) {
      saveCurrentPosition();
      originalPushState(...args);
      currentUrl = window.location.href;
    };

    history.replaceState = function (...args) {
      saveCurrentPosition();
      originalReplaceState(...args);
      currentUrl = window.location.href;
    };

    const handlePopState = () => {
      saveCurrentPosition();
      currentUrl = window.location.href;
      // Flagged for the layout effect: this navigation is a history move, so it
      // restores instead of jumping to the top.
      pendingScrollPosition.current = positions.get(currentUrl) ?? { x: 0, y: 0 };
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      saveCurrentPosition();
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useLayoutEffect(() => {
    const previousPath = previousPathname.current;
    previousPathname.current = pathname;

    const restorePosition = pendingScrollPosition.current;
    pendingScrollPosition.current = null;

    // First render of a full page load — the browser has already placed us.
    if (previousPath === null) return;

    if (restorePosition) {
      // Next applies its default scroll after changing history. Restoring on the
      // following frame lets this manual policy win without changing every link.
      const frame = window.requestAnimationFrame(() => {
        window.scrollTo(restorePosition.x, restorePosition.y);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    // Only the query string moved — the user is still on the same page.
    if (previousPath === pathname) return;

    // An #anchor in the target URL owns the scroll position instead.
    if (window.location.hash) return;

    // Synchronous, so the new page is already at the top when it first paints;
    // repeated on the next frame in case content mounted below the fold pushed
    // the document around after the commit.
    window.scrollTo(0, 0);
    const frame = window.requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, search]);

  // The Google Translate bootstrap that used to live here — inject the widget
  // script 500ms after every page load, for every visitor — is gone. The loader
  // and the init callback now live in the root layout's helper script, and
  // `doGTranslate` pulls the widget in on demand. Visitors reading the site in
  // English never download it at all; the effect above still calls
  // doGTranslate() when a non-English language is saved, which triggers the load.

  return (
    <>
      <GlobalBackgroundMusic />
      {/* OfferPopup — site-wide, shows once per session after 4s */}
      <OfferPopup />
      {/* App-download modal — referral visits only (?ref=), once per code; embeds the code
          into the Play install referrer */}
      <AppDownloadModal />
    </>
  );
}

export function GlobalUI() {
  // useSearchParams requires a Suspense boundary when rendered from the root layout.
  return (
    <Suspense fallback={null}>
      <GlobalUIInner />
    </Suspense>
  );
}
