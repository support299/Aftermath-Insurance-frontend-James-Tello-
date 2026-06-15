/**
 * GoHighLevel server functions, backed by the Django REST API.
 * Exports keep the same names and call signatures as the original
 * TanStack Start server functions, so call sites are unchanged.
 */

const API_URL: string = import.meta.env.VITE_API_URL || "/api";

async function post<T>(path: string, data: unknown, accessToken?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new Error(json?.error ?? json?.detail ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export type GhlTokenRow = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  location_id: string | null;
  company_id: string | null;
  user_type: string | null;
  scope: string | null;
  updated_at: string;
};

export const exchangeGhlCode = async (opts: {
  data: { code: string; redirectUri: string; accessToken: string };
}): Promise<{ success: boolean }> =>
  post("/ghl/exchange-code/", opts.data, opts.data.accessToken);

export const refreshGhlToken = async (opts: {
  data: { accessToken: string };
}): Promise<{ success: boolean }> =>
  post("/ghl/refresh-token/", opts.data, opts.data.accessToken);

export const updateGhlContactFromSale = async (opts: {
  data: {
    accessToken: string;
    contactId: string;
    lineItems: { kind: "health" | "life" | "addon"; carrier: string; product: string }[];
  };
}): Promise<{ success: boolean; updated: number }> =>
  post("/ghl/update-contact-from-sale/", opts.data, opts.data.accessToken);

export const getGhlStatus = async (opts: {
  data: { accessToken: string };
}): Promise<{
  token: GhlTokenRow | null;
  locationToken: GhlTokenRow | null;
  tokens: GhlTokenRow[];
}> => post("/ghl/status/", opts.data, opts.data.accessToken);

export type GhlOAuthConfig = {
  client_id: string;
  scopes: string;
  version_id: string;
  redirect_uri: string;
};

export const getGhlOAuthConfig = async (opts: {
  data: { accessToken: string };
}): Promise<GhlOAuthConfig> => post("/ghl/oauth-config/", opts.data, opts.data.accessToken);
