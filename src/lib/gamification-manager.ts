import {
  CONTEST_METRICS,
  type AdminContest,
} from "@/lib/gamification-admin";

const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface ManagedTeam {
  id: string;
  name: string;
}

function authHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function parseError(res: Response): Promise<string> {
  const json = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
  return json.detail ?? json.error ?? `Request failed (${res.status})`;
}

export async function fetchManagerContests(accessToken?: string): Promise<{
  contests: AdminContest[];
  teams: ManagedTeam[];
}> {
  const res = await fetch(`${API_URL}/gamification/manager/contests/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { contests?: AdminContest[]; teams?: ManagedTeam[] };
  return { contests: json.contests ?? [], teams: json.teams ?? [] };
}

export async function createManagerContest(
  payload: Partial<AdminContest> & { team_id: string },
  accessToken?: string,
): Promise<AdminContest> {
  const res = await fetch(`${API_URL}/gamification/manager/contests/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminContest;
}

export async function updateManagerContest(
  id: string,
  payload: Partial<AdminContest>,
  accessToken?: string,
): Promise<AdminContest> {
  const res = await fetch(`${API_URL}/gamification/manager/contests/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminContest;
}

export { CONTEST_METRICS };
