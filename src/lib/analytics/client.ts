/**
 * Client-side GA4 tracking via gtag.js.
 * Events go through the browser's gtag instance.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, props);
}

/** Track page view manually (for SPA navigations) */
export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("config", window.gtag, {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}
