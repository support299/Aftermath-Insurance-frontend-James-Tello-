import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getGhlOAuthConfig, getGhlStatus, refreshGhlToken, type GhlOAuthConfig } from "@/lib/ghl.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Not authenticated");
  return t;
}

export const Route = createFileRoute("/_app/connect/")({
  component: GhlPage,
});

type Status = Awaited<ReturnType<typeof getGhlStatus>>["token"];

function GhlPage() {
  const fetchStatus = getGhlStatus;
  const refresh = refreshGhlToken;
  const [status, setStatus] = useState<Status | null>(null);
  const [oauthConfig, setOauthConfig] = useState<GhlOAuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redirectUri, setRedirectUri] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      const [statusRes, configRes] = await Promise.all([
        fetchStatus({ data: { accessToken } }),
        getGhlOAuthConfig({ data: { accessToken } }),
      ]);
      setStatus(statusRes.locationToken ?? statusRes.token ?? null);
      setOauthConfig(configRes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRedirectUri(`${window.location.origin}/connect/callback`);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const installUrl =
    redirectUri && oauthConfig
      ? `https://marketplace.leadconnectorhq.com/v2/oauth/chooselocation?response_type=code&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&client_id=${oauthConfig.client_id}&scope=${encodeURIComponent(oauthConfig.scopes)}&version_id=${oauthConfig.version_id}`
      : "#";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const accessToken = await getAccessToken();
      await refresh({ data: { accessToken } });
      toast.success("Token refreshed");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const expiresIn = status?.expires_at
    ? Math.round((new Date(status.expires_at).getTime() - Date.now()) / 1000 / 60)
    : null;

  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">GoHighLevel Connection</h1>
        <p className="text-sm text-muted-foreground">Hidden admin page for managing the GHL OAuth connection.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Redirect URI (add this to your GHL app)</label>
            <Input value={redirectUri} readOnly />
          </div>
          {oauthConfig && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">OAuth scopes (from backend config)</label>
              <Input value={oauthConfig.scopes} readOnly className="font-mono text-xs" />
            </div>
          )}
          <Button asChild disabled={!oauthConfig}>
            <a href={installUrl} target="_blank" rel="noreferrer">Connect to GoHighLevel</a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Connection Status</span>
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={refreshing || !status}>
              {refreshing ? "Refreshing…" : "Refresh Token"}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !status ? (
            <p className="text-sm text-muted-foreground">No connection yet. Click "Connect to GoHighLevel" above.</p>
          ) : (
            <>
              <Field label="Location ID" value={status.location_id ?? "—"} />
              <Field label="Company ID" value={status.company_id ?? "—"} />
              <Field label="User Type" value={status.user_type ?? "—"} />
              <Field
                label="Expires At"
                value={`${new Date(status.expires_at).toLocaleString()}${
                  expiresIn !== null ? ` (in ${expiresIn} min)` : ""
                }`}
              />
              <Field label="Access Token" value={status.access_token} mono />
              <Field label="Refresh Token" value={status.refresh_token || "—"} mono />
              <Field label="Scope" value={status.scope ?? "—"} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} readOnly className={mono ? "font-mono text-xs" : ""} />
    </div>
  );
}
