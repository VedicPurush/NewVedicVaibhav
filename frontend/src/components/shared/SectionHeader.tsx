import React, { memo } from "react";
import "./SectionHeader.css";

/** The lotus/sidebar rule that precedes every section title. */
const SECTION_ICON =
  "https://vedic-vaibhav.blr1.cdn.digitaloceanspaces.com/vedic-vaibhav/overall_images/sidebar.png";

interface SectionHeaderProps {
  title: React.ReactNode;
  /** Optional right-hand element, e.g. the "See All" pill. */
  action?: React.ReactNode;
  /** Heading level — sections on a page should not all be <h2> if nested. */
  as?: "h2" | "h3";
  className?: string;
}

/**
 * One heading treatment for every section strip, so the homepage, review and
 * video-proof blocks cannot drift apart. Previously each section hand-rolled its
 * own markup and they had diverged: the homepage strips rendered #1E1E1E at
 * weight 500, while the review header used the site heading colour #7C2D12 at
 * weight 600 — visibly two different families of type on one page.
 */
const SectionHeader = memo(({ title, action, as: Tag = "h2", className }: SectionHeaderProps) => (
  <div className={className ? `vv-section-heading ${className}` : "vv-section-heading"}>
    <div className="vv-section-heading__left">
      {/* The artwork is 12x100 — a thin vertical rule. The attributes must state
          its REAL intrinsic size: the browser derives `aspect-ratio` from them,
          and the old width={50} height={50} made it resolve `width:auto` to a
          1:1 box, stretching a 4px rule into a ~34px orange slab that also shoved
          the title out of alignment with the cards below. */}
      <img
        loading="lazy"
        className="vv-section-heading__icon"
        src={SECTION_ICON}
        width={12}
        height={100}
        alt=""
        aria-hidden="true"
      />
      <Tag className="vv-section-heading__title">{title}</Tag>
    </div>
    {action ? <div className="vv-section-heading__action">{action}</div> : null}
  </div>
));

SectionHeader.displayName = "SectionHeader";

export default SectionHeader;
