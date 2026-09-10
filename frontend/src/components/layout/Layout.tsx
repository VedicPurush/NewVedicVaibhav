"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import LazySection from "@/components/widgets/home/LazySection";

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
