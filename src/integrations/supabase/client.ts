/**
 * Drop-in replacement for the Supabase JS client, backed by the Django REST API.
 *
 * Implements the subset of the supabase-js surface this app uses:
 *  - supabase.from(table).select/insert/update/delete + filter/order/limit chains
 *  - supabase.auth: signInWithPassword, signUp, signOut, getSession, getUser,
 *    onAuthStateChange, updateUser, verifyOtp
 *
 * Data shapes (row objects, {data, error} results) match what PostgREST returned,
 * so all existing UI code works unchanged.
 */

const API_URL: string = import.meta.env.VITE_API_URL || "/api";
const STORAGE_KEY = "cdi-auth-session";

// ---------------------------------------------------------------------------
// Types (compatible with @supabase/supabase-js for the parts this app uses)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user: User;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface PostgrestError {
  message: string;
  details?: string;
  code?: string;
}

type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED";

type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void;

// ---------------------------------------------------------------------------
// Session storage + refresh
// ---------------------------------------------------------------------------

function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function decodeJwtExp(token: string): number | undefined {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

let currentSession: Session | null = loadSession();
const listeners = new Set<AuthChangeCallback>();

function emit(event: AuthChangeEvent, session: Session | null) {
  for (const cb of listeners) {
    try {
      cb(event, session);
    } catch (e) {
      console.error("auth listener error", e);
    }
  }
}

function setSession(session: Session | null, event: AuthChangeEvent | null) {
  currentSession = session;
  saveSession(session);
  if (event) emit(event, session);
}

let refreshPromise: Promise<Session | null> | null = null;

async function refreshSession(): Promise<Session | null> {
  if (refreshPromise) return refreshPromise;
  const refresh = currentSession?.refresh_token;
  if (!refresh) return null;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) {
        setSession(null, "SIGNED_OUT");
        return null;
      }
      const json = (await res.json()) as { access: string; refresh?: string };
      const next: Session = {
        access_token: json.access,
        refresh_token: json.refresh ?? refresh,
        expires_at: decodeJwtExp(json.access),
        user: currentSession!.user,
      };
      setSession(next, "TOKEN_REFRESHED");
      return next;
    } catch {
      return currentSession;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function getValidAccessToken(): Promise<string | null> {
  if (!currentSession) return null;
  const exp = currentSession.expires_at ?? decodeJwtExp(currentSession.access_token);
  if (exp && exp * 1000 - Date.now() < 30_000) {
    const refreshed = await refreshSession();
    return refreshed?.access_token ?? null;
  }
  return currentSession.access_token;
}

async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getValidAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401 && retry && currentSession) {
    const refreshed = await refreshSession();
    if (refreshed) return apiFetch(path, init, false);
  }
  return res;
}

// ---------------------------------------------------------------------------
// Query builder (PostgREST-style, backed by /api/db/<table>/)
// ---------------------------------------------------------------------------

type Filter = { column: string; op: string; value: string };
type Order = { column: string; ascending: boolean; nullsFirst?: boolean };

interface QueryResult<T = any[]> {
  data: T;
  error: PostgrestError | null;
}

/** Result type after .maybeSingle()/.single(): data is a row, not an array. */
type SingleQuery = PromiseLike<QueryResult<any>>;

function encodeValue(v: unknown): string {
  if (v === null || v === undefined) return "null";
  return String(v);
}

class QueryBuilder implements PromiseLike<QueryResult<any[]>> {
  private table: string;
  private action: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private columns = "*";
  private values: unknown = undefined;
  private onConflict: string | undefined;
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private limitCount: number | undefined;
  private wantSingle: "maybe" | "strict" | null = null;
  private returnRows = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = "*") {
    if (this.action === "select") {
      this.columns = columns;
    } else {
      this.returnRows = true;
      this.columns = columns;
    }
    return this;
  }

  insert(values: unknown) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  upsert(values: unknown, opts?: { onConflict?: string }) {
    this.action = "upsert";
    this.values = values;
    this.onConflict = opts?.onConflict;
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: "eq", value: encodeValue(value) });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: "neq", value: encodeValue(value) });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, op: "gt", value: encodeValue(value) });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: "gte", value: encodeValue(value) });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, op: "lt", value: encodeValue(value) });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: "lte", value: encodeValue(value) });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ column, op: "in", value: `(${values.map(encodeValue).join(",")})` });
    return this;
  }

  is(column: string, value: null | boolean) {
    this.filters.push({ column, op: "is", value: encodeValue(value) });
    return this;
  }

  not(column: string, op: string, value: unknown) {
    this.filters.push({ column, op: `not.${op}`, value: encodeValue(value) });
    return this;
  }

  like(column: string, pattern: string) {
    this.filters.push({ column, op: "like", value: pattern });
    return this;
  }

  ilike(column: string, pattern: string) {
    this.filters.push({ column, op: "ilike", value: pattern });
    return this;
  }

  contains(column: string, value: unknown) {
    this.filters.push({ column, op: "cs", value: JSON.stringify(value) });
    return this;
  }

  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({
      column,
      ascending: opts?.ascending ?? true,
      nullsFirst: opts?.nullsFirst,
    });
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  maybeSingle(): SingleQuery {
    this.wantSingle = "maybe";
    return this as SingleQuery;
  }

  single(): SingleQuery {
    this.wantSingle = "strict";
    return this as SingleQuery;
  }

  private buildParams(): URLSearchParams {
    const params = new URLSearchParams();
    if (this.action === "select" || this.returnRows) params.set("select", this.columns);
    for (const f of this.filters) params.append(f.column, `${f.op}.${f.value}`);
    for (const o of this.orders) {
      let v = `${o.column}.${o.ascending ? "asc" : "desc"}`;
      if (o.nullsFirst !== undefined) v += o.nullsFirst ? ".nullsfirst" : ".nullslast";
      params.append("order", v);
    }
    if (this.limitCount !== undefined) params.set("limit", String(this.limitCount));
    return params;
  }

  private async execute(): Promise<QueryResult<any>> {
    try {
      const params = this.buildParams();
      const qs = params.toString();
      const path = `/db/${this.table}/${qs ? `?${qs}` : ""}`;
      let res: Response;
      if (this.action === "select") {
        res = await apiFetch(path, { method: "GET" });
      } else if (this.action === "insert" || this.action === "upsert") {
        res = await apiFetch(path, {
          method: "POST",
          body: JSON.stringify({
            values: this.values,
            upsert: this.action === "upsert",
            on_conflict: this.onConflict ?? null,
          }),
        });
      } else if (this.action === "update") {
        res = await apiFetch(path, {
          method: "PATCH",
          body: JSON.stringify({ values: this.values }),
        });
      } else {
        res = await apiFetch(path, { method: "DELETE" });
      }

      const json = (await res.json().catch(() => ({}))) as {
        data?: any[];
        error?: PostgrestError;
      };
      if (!res.ok || json.error) {
        return {
          data: null,
          error: json.error ?? { message: `Request failed (${res.status})` },
        };
      }

      let data: any = json.data ?? [];
      if (this.wantSingle) {
        if (data.length === 0) {
          if (this.wantSingle === "strict") {
            return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" } };
          }
          data = null;
        } else {
          data = data[0];
        }
      } else if (this.action !== "select" && !this.returnRows) {
        data = null;
      }
      return { data, error: null };
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : "Network error" },
      };
    }
  }

  then<TResult1 = QueryResult<any[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<any[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as any, onrejected);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function authRequest(
  path: string,
  body: unknown,
  authed = false,
): Promise<{ json: any; ok: boolean; status: number }> {
  const doFetch = authed ? apiFetch : (p: string, init: RequestInit) => fetch(`${API_URL}${p}`, init);
  const res = await doFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { json, ok: res.ok, status: res.status };
}

function sessionFromTokens(tokens: { access: string; refresh: string; user: User }): Session {
  return {
    access_token: tokens.access,
    refresh_token: tokens.refresh,
    expires_at: decodeJwtExp(tokens.access),
    user: tokens.user,
  };
}

const auth = {
  async signInWithPassword(credentials: { email: string; password: string }) {
    const { json, ok } = await authRequest("/auth/login/", credentials);
    if (!ok) {
      return {
        data: { user: null, session: null },
        error: { message: json?.detail ?? "Invalid login credentials" } as AuthError,
      };
    }
    const session = sessionFromTokens(json);
    setSession(session, "SIGNED_IN");
    return { data: { user: session.user, session }, error: null };
  },

  async signUp(params: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string; data?: Record<string, unknown> };
  }) {
    const { json, ok } = await authRequest("/auth/signup/", {
      email: params.email,
      password: params.password,
      data: params.options?.data ?? {},
    });
    if (!ok) {
      return {
        data: { user: null, session: null },
        error: { message: json?.detail ?? "Sign up failed" } as AuthError,
      };
    }
    const session = sessionFromTokens(json);
    setSession(session, "SIGNED_IN");
    return { data: { user: session.user, session }, error: null };
  },

  async signOut() {
    const refresh = currentSession?.refresh_token;
    if (refresh) {
      try {
        await apiFetch("/auth/logout/", {
          method: "POST",
          body: JSON.stringify({ refresh }),
        });
      } catch {
        /* clear local state regardless */
      }
    }
    setSession(null, "SIGNED_OUT");
    return { error: null };
  },

  async getSession() {
    return { data: { session: currentSession }, error: null };
  },

  async getUser() {
    return {
      data: { user: currentSession?.user ?? null },
      error: currentSession ? null : ({ message: "Not authenticated" } as AuthError),
    };
  },

  onAuthStateChange(callback: AuthChangeCallback) {
    listeners.add(callback);
    // Mirror supabase-js: fire INITIAL_SESSION asynchronously on subscribe
    setTimeout(() => callback("INITIAL_SESSION", currentSession), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            listeners.delete(callback);
          },
        },
      },
    };
  },

  async updateUser(attributes: { password?: string; email?: string }) {
    const { json, ok } = await authRequest("/auth/update-user/", attributes, true);
    if (!ok) {
      return {
        data: { user: null },
        error: { message: json?.detail ?? "Update failed" } as AuthError,
      };
    }
    return { data: { user: currentSession?.user ?? null }, error: null };
  },

  async verifyOtp(params: { type: string; token_hash: string }) {
    const { json, ok } = await authRequest("/auth/verify-otp/", params);
    if (!ok) {
      return {
        data: { user: null, session: null },
        error: { message: json?.detail ?? "Invalid or expired token" } as AuthError,
      };
    }
    const session = sessionFromTokens(json);
    setSession(session, "SIGNED_IN");
    return { data: { user: session.user, session }, error: null };
  },
};

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

export const supabase = {
  auth,
  from(table: string) {
    return new QueryBuilder(table);
  },
};
