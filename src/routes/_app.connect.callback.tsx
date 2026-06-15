import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { exchangeGhlCode } from "@/lib/ghl.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/connect/callback")({
  component: GhlCallbackPage,
});

function GhlCallbackPage() {
  const exchange = exchangeGhlCode;
  const navigate = useNavigate();
  const [state, setState] = useState<"working" | "success" | "error">("working");
  const [message, setMessage] = useState("Exchanging authorization code…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setState("error");
      setMessage("No code parameter found in URL.");
      return;
    }
    const redirectUri = `${window.location.origin}/connect/callback`;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setState("error");
        setMessage("You must be logged in as an admin.");
        return;
      }
      try {
        await exchange({ data: { code, redirectUri, accessToken } });
        setState("success");
        setMessage("Connected successfully. Redirecting…");
        setTimeout(() => navigate({ to: "/connect" }), 1200);
      } catch (e) {
        setState("error");
        setMessage(e instanceof Error ? e.message : "Failed to exchange code");
      }
    })();
  }, [exchange, navigate]);

  return (
    <div className="container mx-auto max-w-xl py-12">
      <Card>
        <CardHeader>
          <CardTitle>GoHighLevel Callback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className={state === "error" ? "text-destructive" : "text-muted-foreground"}>{message}</p>
          {state === "error" && (
            <Button asChild variant="outline">
              <Link to="/connect">Back to GHL Settings</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
