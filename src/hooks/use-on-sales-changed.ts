import { useEffect } from "react";
import { onSalesChanged } from "@/lib/sales-events";

/** Re-run `callback` whenever a sale is created, updated, or deleted. */
export function useOnSalesChanged(callback: () => void): void {
  useEffect(() => {
    return onSalesChanged(callback);
  }, [callback]);
}
