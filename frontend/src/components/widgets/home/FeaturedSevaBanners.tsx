"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * FeaturedSevaBanners
 * -------------------
 * Two promotional banners — Shri Banke Bihari Ji Seva and 12 Jyotirlinga —
 * side by side on desktop, stacked on mobile. Each banner is a single large
 * link to its service page.
 *
 * ─── REPLACE THESE TWO URLs WITH THE FINAL ARTWORK ───────────────────────
 * Drop the banner images on the CDN (same bucket as the rest of the site) and
 * paste the URLs below. Nothing else needs to change — the links, layout and
 * responsive behaviour are already wired up.
 *
 * Artwork guidance: both banners share one aspect ratio (BANNER_ASPECT below),
 * and are rendered with object-cover, so anything that is not that ratio gets
 * cropped from the edges. Either export the artwork at 16:7 (e.g. 1600x700),
 * or change BANNER_ASPECT to match what you have — keep important text away
 * from the extreme edges either way.
 */
const BANNERS = [
  {
    /** TODO: replace with the final Banke Bihari banner URL */
    src: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/Pandit%20ji%20at%20request/banke%20bihari%20ji-optimized.webp",
    href: "/services/banke-bihariji",
    /** Read out by screen readers and shown if the image fails to load. */
    alt: "Shri Banke Bihari Ji Seva — book your seva at the Banke Bihari temple, Vrindavan",
    label: "Shri Banke Bihari Ji Seva",
  },
  {
    /** TODO: replace with the final 12 Jyotirlinga banner URL */
    src: "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/Pandit%20ji%20at%20request/shiv%20(2)-optimized.webp",
    href: "/services/12-jyotirlinga",
    alt: "12 Jyotirlinga — book puja at the twelve sacred Jyotirlinga temples",
    label: "12 Jyotirlinga",
  },
] as const;

/**
 * The aspect ratio each banner is rendered at. Set on the wrapper rather than
 * relying on the file's own dimensions, so the browser reserves the exact space
 * before the image arrives and the section never shifts as it loads.
 */
const BANNER_ASPECT = "16 / 7";

/**
 * Matches the horizontal rhythm and reserved height of the other homepage
 * sections. Keep min-h in sync with HomePage's `placeholderHeight` — that
 * pairing is what stops the section resizing once it mounts.
 */
const SECTION_BOX = "flex flex-col px-[3%] md:px-[6%] min-h-[345px] md:min-h-[160px]";

const FeaturedSevaBanners = () => (
  <div className={SECTION_BOX}>
    {/* One column on mobile (banners stack), two from md up (side by side). */}
    {/* Bottom margin only. The Puja strip immediately above already ends with
        mb-3, so a matching top margin here doubled the gap — the banner sat
        noticeably lower than every other section boundary on the page. */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 w-full mb-3 md:mb-4">
      {BANNERS.map((banner, index) => (
        <Link
          key={banner.href}
          href={banner.href}
          aria-label={banner.label}
          className="group relative block w-full overflow-hidden rounded-xl md:rounded-2xl shadow-md hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-shadow duration-300"
          style={{ aspectRatio: BANNER_ASPECT }}
        >
          {/* Measured: on a 412x823 phone this first banner IS the Largest
              Contentful Paint element. The banners stack on mobile, so at
              412px wide by 16/7 each is ~412x180 = 74,000px² of visible area —
              larger than the hero strip above it (~53,000px²), and still inside
              the fold. Chrome picks the largest, so the hero being fast did not
              matter; this image decided the score.

              It was a plain <img loading="lazy"> pointing at the full-size
              original (65KB, unresized, one per banner). Lazy meant the browser
              would not even queue it until layout, and it then landed at 4.8s on
              a throttled mobile connection — that WAS the 6.1s LCP.

              Two changes: next/image resizes it to the slot and negotiates
              AVIF/WebP, and the first one loads eagerly at high priority instead
              of lazily. The second banner stays lazy — on mobile it is a full
              banner-height below this one, and on desktop they sit side by side
              where this one has already warmed the connection. */}
          <Image
            src={banner.src}
            alt={banner.alt}
            fill
            // Side by side from md (minus the 3% gutters and the gap), stacked
            // and full-width below it.
            sizes="(min-width: 768px) 45vw, 94vw"
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      ))}
    </div>
  </div>
);

export default FeaturedSevaBanners;
