"use client";

import dynamic from "next/dynamic";
import Navbar from "./Navbar";
import LazySection from "@/components/widgets/home/LazySection";

/**
 * The footer is the last thing on every page, and LazySection already holds it
 * back until the user scrolls within 100px of it. A *static* import defeated
 * half of that: deferring the render does nothing about the download, so the
 * footer's dependencies — framer-motion plus five @mui/icons-material icons,
 * which webpack grouped into a single 124KB chunk — were still fetched, parsed
 * and compiled in the initial payload of all 38 pages that use this Layout.
 * That parse happens on the main thread during hydration, which is exactly what
 * Total Blocking Time measures.
 *
 * Loading it dynamically makes the deferral real: the chunk is requested when
 * LazySection mounts the component, i.e. when the footer is nearly in view.
 * ssr is left ON so the footer's links stay in the server HTML for crawlers.
 */
const Footer = dynamic(() => import("./Footer"));

const Layout = ({
  content,
  activeIndex,
}: {
  content: React.ReactNode;
  activeIndex?: string;
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <Navbar activeIndex={activeIndex} />
      </div>

      {/* One tree, breakpoint-switched in CSS. Rendering `content` twice behind
          `hidden`/`block` mounted every widget twice — double timers, double
          observers and duplicate element ids — because `hidden` only hides. */}
      {/* Spacer for the fixed header — see .header-offset in Navbar.css for why
          this is a calc() rather than a percentage. The desktop value switches
          at 768px because that is where the antd Cols swap the mobile header
          for the desktop one; the old sm: breakpoint (640px) applied the
          desktop spacer to 128px of viewport that still shows the mobile bar. */}
      <div className="header-offset">{content}</div>

      <LazySection placeholderHeight={400} rootMargin="100px">
        <Footer />
      </LazySection>
    </div>
  );
};

export default Layout;
