import type { SaleRow } from "@/lib/sales";
import type { ExpenseRow } from "@/lib/expenses";

const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface LeaderboardTeam {
  id: string;
  name: string;
}

export interface LeaderboardProfile {
  id: string;
  display_name: string;
  team_id: string | null;
}

export interface LeaderboardData {
  sales: SaleRow[];
  expenses: ExpenseRow[];
  teams: LeaderboardTeam[];
  profiles: LeaderboardProfile[];
}

/**
 * Company-wide leaderboard data for any authenticated user (agent, manager, or
 * admin all see the full set). Backed by /api/leaderboards/, which deliberately
 * bypasses the per-row sales RLS used everywhere else.
 */
export async function fetchLeaderboardData(
  from: Date,
  to: Date,
  accessToken?: string,
): Promise<LeaderboardData> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}/leaderboards/?${params.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`Leaderboard request failed (${res.status})`);
  }
  const json = (await res.json()) as Partial<LeaderboardData>;
  return {
    sales: (json.sales ?? []) as SaleRow[],
    expenses: (json.expenses ?? []) as ExpenseRow[],
    teams: (json.teams ?? []) as LeaderboardTeam[],
    profiles: (json.profiles ?? []) as LeaderboardProfile[],
  };
}
