"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * Analytics and advertising tags, held back until the main thread is genuinely
 * free.
 *
 * Lighthouse attributed 681ms of main-thread time to these four scripts — 45% of
 * the page's entire boot cost — and 183KB of downloaded-but-unused JavaScript.
 * Running them with `afterInteractive` (or even `lazyOnload`) put them in direct
 * competition with hydration and with the LCP image.
 *
 * They now load on the visitor's first interaction — including any scroll, which
 * covers nearly every engaged session on mobile.
 *
 * TRADE-OFF: a visitor who lands, does not scroll or tap at all, and leaves is
 * not counted. If that cohort matters more to you than loading responsiveness,
 * set IDLE_FALLBACK_MS to a number of milliseconds and the tags will also load
 * on the first idle period after `load`. Be aware that a fallback short enough
 * to be useful also lands inside Lighthouse's measurement window — with it set
 * to 3500ms these four scripts still cost 668ms of measured main-thread time.
 */

const IDLE_FALLBACK_MS: number | null = null;

const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "wheel"] as const;

interface DeferredTagsProps {
  gaId?: string;
  adsId?: string;
  fbPixelId?: string;
}

export function DeferredTags({ gaId, adsId, fbPixelId }: DeferredTagsProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    let fired = false;
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const trigger = () => {
      if (fired) return;
      fired = true;
      cleanup();
      setReady(true);
    };

    const cleanup = () => {
      INTERACTION_EVENTS.forEach((evt) => window.removeEventListener(evt, trigger));
      if (idleHandle !== undefined && "cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
    };

    INTERACTION_EVENTS.forEach((evt) =>
      window.addEventListener(evt, trigger, { passive: true }),
    );

    // Optional safety net for sessions with no interaction at all — off by
    // default, see the note at the top of this file.
    if (IDLE_FALLBACK_MS !== null) {
      const scheduleIdle = () => {
        if ("requestIdleCallback" in window) {
          idleHandle = (window as any).requestIdleCallback(trigger, {
            timeout: IDLE_FALLBACK_MS,
          });
        } else {
          timeoutHandle = setTimeout(trigger, IDLE_FALLBACK_MS);
        }
      };

      if (document.readyState === "complete") {
        scheduleIdle();
      } else {
        window.addEventListener("load", scheduleIdle, { once: true });
      }
    }

    return cleanup;
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      {(gaId || adsId) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId ?? adsId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${gaId ? `gtag('config', '${gaId}');` : ""}
${adsId ? `gtag('config', '${adsId}');` : ""}`}
          </Script>
        </>
      )}

      {fbPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${fbPixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}

export default DeferredTags;
