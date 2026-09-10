"use client";

import React, { useRef, useState, useEffect } from "react";
import SectionBoundary from "@/components/common/SectionBoundary";

interface LazySectionProps {
  children: React.ReactNode;
  /**
   * Height placeholder shown before the section mounts.
   * Keeps the page layout stable so the scroll position doesn't jump.
   */
  placeholder?: React.ReactNode;
  placeholderHeight?: number;
  /**
   * rootMargin — how far before the element enters the viewport
   * we start rendering it. "400px" means start loading 400px ahead.
   */
  rootMargin?: string;
  className?: string;
  id?: string;
  /** Skip the observer entirely — for sections that are above the fold. */
  eager?: boolean;
  /** Labels the section in error logs. */
  name?: string;
}

/**
 * LazySection
 * -----------
 * Defers mounting of children until the section is close to the viewport.
 * Uses the native IntersectionObserver API (no extra deps required).
 *
 * Strategy:
 *  - Before visible → renders a lightweight placeholder div (just a height holder).
 *  - Once visible (or `rootMargin` away) → mounts children for real.
 *  - After mounting, the observer is disconnected to avoid wasted work.
 *
 * The default margin is deliberately generous: mounting kicks off a chunk
 * download *and then* a network request, so a tight margin guarantees the user
 * watches a spinner. Starting early hides both behind the scroll.
 *
 * Children are wrapped in an error boundary + Suspense here, using the same
 * height as the placeholder — so a section holds one consistent footprint from
 * placeholder through chunk-load to content, rather than resizing at each step.
 */
const LazySection: React.FC<LazySectionProps> = ({
  children,
  placeholder,
  placeholderHeight = 300,
  rootMargin = "400px",
  className,
  id,
  eager = false,
  name,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(eager);

  useEffect(() => {
    if (eager) return;

    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver is not supported (very old browsers), render immediately
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Stop observing once mounted — no need to watch further
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, eager]);

  const spacer = placeholder ?? <div style={{ height: placeholderHeight }} />;

  return (
    <div ref={ref} id={id} className={className}>
      {isVisible ? (
        <SectionBoundary name={name ?? id} pending={spacer}>
          {children}
        </SectionBoundary>
      ) : (
        spacer
      )}
    </div>
  );
};

export default LazySection;
