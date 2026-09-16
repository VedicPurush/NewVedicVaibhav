import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppProviders } from "@/components/providers/AppProviders";
import { GlobalUI } from "@/components/global/GlobalUI";
import { DeferredTags } from "@/components/global/DeferredTags";
import { allSchemas } from "@/lib/structured-data";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vedicvaibhav.com";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const FB_PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
const LOGO_URL = "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/webLogo.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Vedic Vaibhav — Online Puja, Chadhava & Prasad from India's Sacred Temples",
  description:
    "Book authentic online puja, chadhava & prasad delivery from Vrindavan, Kedarnath, Vaishno Devi & 12 Jyotirlinga temples. Performed in your name & gotra by certified pandits. Trusted by 1 lakh+ devotees across India.",
  keywords:
    "online puja booking, chadhava online, prasad delivery, book puja online india, vrindavan puja online, kedarnath chadhava, banke bihari prasad, 12 jyotirlinga puja, gau seva online, vedic pathshala, pooja samagri online, mandir online booking",
  authors: [{ name: "Vedic Vaibhav" }],
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
    googleBot: "index, follow",
  },
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Vedic Vaibhav",
    type: "website",
    locale: "en_IN",
    url: `${SITE_URL}/`,
    title: "Vedic Vaibhav — Online Puja, Chadhava & Prasad from India's Sacred Temples",
    description:
      "Book authentic online puja, chadhava & prasad delivery from Vrindavan, Kedarnath, Vaishno Devi & 12 Jyotirlinga temples. Performed in your name & gotra by certified pandits.",
    images: [
      {
        url: LOGO_URL,
        width: 1200,
        height: 630,
        alt: "Vedic Vaibhav — Online Puja & Spiritual Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@vedicvaibhav",
    creator: "@vedicvaibhav",
    title: "Vedic Vaibhav — Online Puja, Chadhava & Prasad Delivery",
    description:
      "Book puja, chadhava & prasad from Vrindavan, Kedarnath & 12 Jyotirlinga. Performed in your name & gotra. 1 lakh+ devotees trust us.",
    images: { url: LOGO_URL, alt: "Vedic Vaibhav — Online Puja & Spiritual Services" },
  },
  icons: { icon: LOGO_URL, apple: LOGO_URL },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FF6B00",
};

/** Runs before hydration: Google Translate mutates the DOM behind React's back,
 *  which crashes removeChild/insertBefore — patch both to no-op on foreign nodes.
 *
 *  Applied ONLY when a non-English translation is actually active. The patch adds
 *  a wrapper call and a parentNode comparison to every DOM insertion and removal
 *  in the app — React performs a great many of those — and there is nothing to
 *  guard against until Google Translate is rewriting the page. */
const translateAntiCrashPatch = `
(function () {
  try {
    var gt = document.cookie.match(/googtrans=([^;]+)/);
    var active = gt && decodeURIComponent(gt[1]).replace(/\\/$/, '').split('/').pop();
    if (!active || active === 'en') { return; }
  } catch (e) { return; }

  if (typeof Node === 'function' && Node.prototype) {
    var _rc = Node.prototype.removeChild;
    Node.prototype.removeChild = function (child) {
      if (child.parentNode !== this) { return child; }
      return _rc.apply(this, arguments);
    };
    var _ib = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (newNode, referenceNode) {
      if (referenceNode && referenceNode.parentNode !== this) { return newNode; }
      return _ib.apply(this, arguments);
    };
  }
})();`;

/** Runs before hydration: capture ?ref= partner codes and strip them from the URL
 *  before React ever sees the param (AppDownloadModal reads the session flag). */
const referralCaptureScript = `
(function () {
  try {
    var urlParams = new URLSearchParams(window.location.search);
    var referralCode = urlParams.get('ref');
    if (referralCode) {
      localStorage.setItem('vedicvaibhav_ref_code', referralCode);
      sessionStorage.setItem('vv_ref_arrival', referralCode);
      var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }
  } catch (e) {}
})();`;

/** Google Translate glue.
 *
 *  The widget script (~250KB, of which Lighthouse measured ~47KB parsed but
 *  unused) used to be injected on every page load for every visitor, including
 *  the English-reading majority who never translate anything. It is now loaded
 *  on demand: either because a non-English language is already saved, or because
 *  the user actually picks one from a language selector.
 *
 *  Widget UI suppression moved to globals.css — see the note there. */
const translateHelpersScript = `
window.__vvLoadTranslate = function () {
  if (window.__vvTranslateRequested) return;
  window.__vvTranslateRequested = true;

  window.googleTranslateElementInit2 = function () {
    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: true,
          includedLanguages: "en,hi,bn,te,mr,ta,gu,kn,ml,or,pa,as,ur,sa,sd,mai,ne",
        },
        "google_translate_element2"
      );
    }
  };

  if (window.google && window.google.translate && window.google.translate.TranslateElement) {
    window.googleTranslateElementInit2();
    return;
  }

  if (!document.querySelector('script[src*="translate_a/element.js"]')) {
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit2";
    s.async = true;
    document.body.appendChild(s);
  }
};

function doGTranslate(lang_pair) {
  if (!lang_pair) return;
  if (typeof lang_pair !== "string") {
    if (lang_pair.value) lang_pair = lang_pair.value; else return;
  }
  if (!lang_pair.includes("|")) return;
  var lang = lang_pair.split("|")[1];
  if (!lang) return;

  // Selecting a language is the signal that the widget is genuinely needed.
  window.__vvLoadTranslate();

  var teCombo = null;
  var selects = document.getElementsByTagName("select");
  for (var i = 0; i < selects.length; i++) {
    if (selects[i].className.includes("goog-te-combo")) { teCombo = selects[i]; break; }
  }
  var widget = document.getElementById("google_translate_element2");
  if (!widget || !teCombo || !teCombo.innerHTML.trim().length) {
    setTimeout(function () { doGTranslate(lang_pair); }, 500);
    return;
  }
  teCombo.value = lang;
  teCombo.dispatchEvent(new Event("change", { bubbles: true }));
}`;

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@400;500;600&family=Open+Sans:wght@400;500;600&family=Montserrat:wght@400;500;600&family=Baloo+2:wght@400;500;600;700;800&family=Marcellus&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=Kurale&display=swap";

/**
 * Creates the font stylesheet link and flips it from media="print" (parsed, not
 * applied, not render-blocking) to media="all" once downloaded.
 *
 * The <link> is built HERE rather than rendered by React on purpose. React would
 * serialise media="print" into the SSR HTML, this script would flip it to "all"
 * during head parsing — long before hydration — and React would then report a
 * hydration mismatch on that attribute ("server rendered media='print', client
 * has media='all'"). Owning the node outside React removes the mismatch by
 * construction, rather than papering over it with suppressHydrationWarning.
 *
 * The preload above has already started the download at full priority, so this
 * link resolves from cache; media="print" keeps it off the render-blocking path.
 */
const FONT_ACTIVATION_SCRIPT = `
(function () {
  if (document.querySelector('link[data-vv-fonts]')) return;
  var l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = ${JSON.stringify(FONTS_HREF)};
  l.media = 'print';
  l.setAttribute('data-vv-fonts', '');
  l.onload = function () { l.media = 'all'; };
  document.head.appendChild(l);
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Fonts — literal family names are referenced throughout the ported CSS,
            so this stays a single combined Google Fonts request rather than
            migrating to next/font (which would rename every family).

            It is loaded with rel="preload" as="style" and promoted to a real
            stylesheet on load, so it downloads at full priority WITHOUT blocking
            first render — Lighthouse attributed ~870ms of render-blocking time to
            this one request. The families already use display=swap, so text has
            always painted in the fallback first; this only shortens the blank
            period before that happens. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Banner, temple and card imagery all come from this one CDN, and the
            desktop hero <img> references it directly — so the TLS handshake is
            on the critical path to Largest Contentful Paint. Opening it here
            overlaps the handshake with HTML parsing instead of paying for it
            after the image URL is discovered. */}
        <link
          rel="preconnect"
          href="https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com"
          crossOrigin="anonymous"
        />
        <link rel="preload" as="style" href={FONTS_HREF} />
        {/* The stylesheet <link> itself is injected by this script, not rendered
            by React — see FONT_ACTIVATION_SCRIPT for why. */}
        <script dangerouslySetInnerHTML={{ __html: FONT_ACTIVATION_SCRIPT }} />
        <noscript>
          <link rel="stylesheet" href={FONTS_HREF} />
        </noscript>
        {/* Site-wide background artwork (see globals.css) is deliberately NOT
            preloaded.

            It used to be, one <link> per breakpoint. But a preload is a request
            for *critical* bandwidth, and on a phone this artwork is 97KB
            (mobile_bg.webp) fetched from the document <head> — ahead of the hero
            banner, which is the LCP element. On Lighthouse's throttled mobile
            connection that is roughly half a second during which the one image
            the score depends on is not downloading, spent on a decorative layer
            sitting at z-index -1 behind every pixel of content.

            Dropping the preload does not drop the image: the body::before rule
            in globals.css still fetches it, now at the browser's own (lower)
            priority, behind the content that the user is actually waiting for.
            --site-bg-fallback paints the same cream as the centre of both files
            in the meantime, so the gap reads as the intended background rather
            than as a missing one. */}
        {allSchemas.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      </head>
      <body>
        <Script id="gt-anti-crash" strategy="beforeInteractive">
          {translateAntiCrashPatch}
        </Script>
        <Script id="vv-referral-capture" strategy="beforeInteractive">
          {referralCaptureScript}
        </Script>

        {/* Google Translate mounts its hidden widget here. */}
        <div id="google_translate_element2" style={{ position: "absolute", top: -1000, left: -1000 }} />

        <AppProviders>
          <GlobalUI />
          {children}
        </AppProviders>

        <Script id="gt-helpers" strategy="afterInteractive">
          {translateHelpersScript}
        </Script>

        {/* Analytics and pixels load on first interaction, or on the first idle
            period after load — see components/global/DeferredTags. Events fired
            before then are queued in dataLayer by lib/gtag.ts, so nothing is
            dropped. */}
        <DeferredTags gaId={GA_ID} adsId={ADS_ID} fbPixelId={FB_PIXEL_ID} />

        {/* Google Identity Services used to be loaded here on every page — 85KB
            for a sign-in button that was never reachable in the UI. Google auth
            has since been removed from the website entirely; login is phone/email
            OTP via components/pages/home/LoginModel. */}
      </body>
    </html>
  );
}
