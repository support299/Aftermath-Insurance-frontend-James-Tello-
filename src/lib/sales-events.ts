/** Broadcast when sales are created, updated, or deleted so dashboards refresh immediately. */
export const SALES_CHANGED_EVENT = "sales:changed";

export function notifySalesChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SALES_CHANGED_EVENT));
  }
}

export function onSalesChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SALES_CHANGED_EVENT, listener);
  return () => window.removeEventListener(SALES_CHANGED_EVENT, listener);
}

/** Default auto-refresh interval for live reporting views (1 minute). */
export const LIVE_REFRESH_MS = 60_000;
