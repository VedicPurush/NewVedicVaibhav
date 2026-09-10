declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

type GtagCommand = "config" | "event" | "consent";
type GtagFunction = (
  command: GtagCommand,
  targetIdOrEventName: string,
  params?: Record<string, any>,
) => void;

/**
 * Queues into dataLayer when gtag.js has not loaded yet.
 *
 * This previously did `if (window.gtag) window.gtag(...)` and otherwise dropped
 * the call on the floor — so any event fired before the library finished
 * downloading was lost, including the initial page_view (which GlobalUI sends
 * from a mount effect). Pushing to dataLayer is exactly what the official gtag
 * snippet does; gtag.js drains the queue when it loads.
 */
export const gtag: GtagFunction = (...args) => {
  if (typeof window === "undefined") return;

  if (window.gtag) {
    window.gtag(...args);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  // gtag.js drains dataLayer by indexed access and `.length`, so an array is
  // processed identically to the `arguments` object the official snippet pushes.
  window.dataLayer.push(args);
};
