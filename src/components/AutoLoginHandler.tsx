import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Detects `?logid=...` in the URL on mount, exchanges it for a Supabase session,
 * then strips the param. Single-use; safe to mount once at the app root.
 */
export function AutoLoginHandler() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const logid = url.searchParams.get("logid");
    if (!logid) return;

    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/public/auth/exchange-logid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ logid }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          email?: string;
          token_hash?: string;
          error?: string;
        };

        // Always remove the param from the URL
        url.searchParams.delete("logid");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);

        if (!res.ok || !payload.token_hash) {
          toast.error(payload.error ?? "Auto-login failed");
          return;
        }

        const { error } = await supabase.auth.verifyOtp({
          type: "magiclink",
          token_hash: payload.token_hash,
        });
        if (error) {
          toast.error(error.message);
          return;
        }

        // Reload so loaders/auth state pick up the fresh session
        window.location.replace("/dashboard");
      } catch (e) {
        console.error("AutoLogin error:", e);
        toast.error("Auto-login failed");
      }
    })();
  }, []);

  return null;
}
