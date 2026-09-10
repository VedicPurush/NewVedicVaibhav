"use client";

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
      {BANNERS.map((banner) => (
        <Link
          key={banner.href}
          href={banner.href}
          aria-label={banner.label}
          className="group block w-full overflow-hidden rounded-xl md:rounded-2xl shadow-md hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-shadow duration-300"
          style={{ aspectRatio: BANNER_ASPECT }}
        >
          <img
            src={banner.src}
            alt={banner.alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>
      ))}
    </div>
  </div>
);

export default FeaturedSevaBanners;
