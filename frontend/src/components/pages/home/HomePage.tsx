"use client";

import React, { lazy } from "react";
import Layout from "@/components/layout/Layout";
import LazySection from "@/components/widgets/home/LazySection";
import { EMPTY_HOME_DATA, type HomeInitialData } from "@/lib/server/homeData";

/**
 * The four server-rendered sections are imported statically, not lazily.
 *
 * A lazy chunk still has to download in the browser, and until it does, Suspense
 * swaps in its fallback — even though the server already resolved that slot. The
 * result was a spacer being inserted into settled layout and then removed again:
 * measured at 0.10 of CLS for the puja section alone. Code-splitting a component
 * you server-render buys nothing and costs a layout shift.
 */
import HomepageSlider from "@/components/widgets/home/slider";
import BannerShriBankeBihariji from "@/components/pages/services/puja/shri-banke-bihari/BannerShriBankeBihariji";
import FeaturedSevaBanners from "@/components/widgets/home/FeaturedSevaBanners";
import ChadhavaComponent from "@/components/widgets/home/ChadhavaComponent";
import Puja from "@/components/widgets/home/Puja";

// Genuinely below the fold — these stay split and load on approach.
const MandirHomePageComponent = lazy(() => import("@/components/widgets/mandir/MandirHomePageComponent"));
const ReviewPuja = lazy(() => import("@/components/widgets/puja/ReviewPuja"));
const LoginPopup = lazy(() => import("@/components/pages/home/LoginPopup"));

interface HomePageProps {
  /** Server-fetched lists for the first render. See lib/server/homeData. */
  initialData?: HomeInitialData;
}

const HomePage = ({ initialData = EMPTY_HOME_DATA }: HomePageProps) => (
  <Layout content={<HomeContent initialData={initialData} />} activeIndex="home" />
);

export default HomePage;

/**
 * Section gating notes
 * --------------------
 * `eager` marks the sections that render on the server. That is two separate
 * benefits at once:
 *
 *   - they are never gated behind an IntersectionObserver round trip, and
 *   - their markup lands in the server HTML, which is the only way crawlers
 *     (and the first paint) ever see a puja or chadhava.
 *
 * The two hero surfaces are eager because they are above the fold. Chadhava and
 * Puja are eager because they are the page's commercial content — with the
 * lists arriving as `initialData` they render fully formed rather than as a
 * placeholder.
 *
 * Everything below that stays deferred, with a 400px margin (see LazySection)
 * so the chunk download and the API request both resolve before the section
 * scrolls into view.
 */
const HomeContent = ({ initialData }: { initialData: HomeInitialData }) => (
  <main>
    {/* The homepage had no h1 at all. Visually hidden so the design is unchanged,
        but it gives crawlers and screen-reader users the page's actual subject. */}
    <h1 className="sr-only">
      Vedic Vaibhav — book online puja, chadhava and prasad from India&apos;s sacred temples
    </h1>

    {/* ── ABOVE THE FOLD ────────────────────────────────────────────────── */}

    {/* Desktop hero carousel */}
    <section id="home" aria-label="Featured offerings" className="mb-[2vh] hidden md:block">
      <div className="md:mx-[4%] mx-[2%] px-[2.2%]">
        <LazySection eager name="hero-slider" placeholderHeight={280}>
          <HomepageSlider initialBanners={initialData.banners} />
        </LazySection>
      </div>
    </section>

    {/* Mobile hero strip — the first paint on phones, so it must not be gated */}
    <div className="md:hidden">
      <LazySection eager name="mobile-banner" placeholderHeight={200}>
        <BannerShriBankeBihariji initialBanners={initialData.banners} />
      </LazySection>
    </div>

    {/* ── BELOW THE FOLD — deferred via IntersectionObserver ────────────── */}

    {/* placeholderHeight must match each widget's SECTION_BOX min-height at the
        mobile breakpoint — that pairing is what keeps the reserved space and the
        rendered space identical, so the section never resizes after it mounts. */}

    <section id="chadhava" aria-label="Upcoming chadhava">
      <LazySection eager name="chadhava" placeholderHeight={280}>
        <ChadhavaComponent initialChadhava={initialData.chadhava} />
      </LazySection>
    </section>

    <section id="services-puja" aria-label="Upcoming pujas">
      <LazySection eager name="puja" placeholderHeight={257}>
        <Puja initialPoojas={initialData.poojas} initialMandirs={initialData.mandirs} />
      </LazySection>
    </section>

    {/* Two featured seva banners — side by side on desktop, stacked on mobile.
        Eager despite sitting below the fold: the exception the note above
        describes is a section that downloads a chunk or fires a request, and
        this one does neither (statically imported, no query). Deferring it
        would only hold an empty spacer until it scrolls into view, while
        rendering it on the server puts two internal links in the HTML where
        crawlers can follow them. The images themselves still load lazily. */}
    <section aria-label="Featured sevas">
      <LazySection eager name="featured-seva-banners" placeholderHeight={345}>
        <FeaturedSevaBanners />
      </LazySection>
    </section>

    <section id="mandir" aria-label="Personalised puja by temple">
      <LazySection name="mandir" placeholderHeight={193}>
        <MandirHomePageComponent />
      </LazySection>
    </section>

    <section aria-label="Devotee reviews">
      <LazySection name="reviews" placeholderHeight={220}>
        {/* Lines the review/video headings up with the strips above them, which
            use px-[3%] md:px-[6%]. ReviewPuja carries its own 12px/10px gutter
            for the three other pages that render it bare, so that amount is
            subtracted here rather than changing the component and shifting those
            pages. Net gutter: exactly 3% on phones, 6% from md up. */}
        <div className="px-[calc(3%_-_12px)] md:px-[calc(6%_-_10px)]">
          <ReviewPuja />
        </div>
      </LazySection>
    </section>

    {/* LoginPopup — non-visual, load last */}
    <LazySection name="login-popup" placeholderHeight={0} rootMargin="500px">
      <LoginPopup />
    </LazySection>
  </main>
);