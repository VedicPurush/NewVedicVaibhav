"use client";

import React, { Suspense } from "react";

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  /** Rendered instead of the section when it throws. */
  fallback?: React.ReactNode;
  /** Used only to label the error in the console. */
  name?: string;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
}

/**
 * Suspense catches loading, not throwing. Without this, one bad record from the
 * API takes the whole homepage down instead of the one section that read it.
 */
class SectionErrorBoundary extends React.Component<
  SectionErrorBoundaryProps,
  SectionErrorBoundaryState
> {
  state: SectionErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SectionErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.name ?? "section"}] failed to render`, error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

interface SectionBoundaryProps {
  children: React.ReactNode;
  /** Shown while the lazy chunk downloads. Should match the section's real height. */
  pending?: React.ReactNode;
  name?: string;
}

/**
 * The pairing every homepage section needs: an error boundary outside a Suspense
 * boundary. A section that fails collapses quietly; a section that is still
 * loading holds its space.
 */
export const SectionBoundary: React.FC<SectionBoundaryProps> = ({
  children,
  pending = null,
  name,
}) => (
  <SectionErrorBoundary name={name}>
    <Suspense fallback={pending}>{children}</Suspense>
  </SectionErrorBoundary>
);

export default SectionBoundary;
