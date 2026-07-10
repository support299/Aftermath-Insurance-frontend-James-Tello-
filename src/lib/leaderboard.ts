import type { ActivityEvent, AgentProgress } from "@/lib/gamification";

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

export interface AgentStat {
  agent_id: string;
  agent_name: string;
  team_id: string | null;
  team_name: string;
  revenue: number;
  count: number;
  avgDeal: number;
  lifeCount: number;
  healthCount: number;
  addonCount: number;
  lifeRevenue: number;
  healthRevenue: number;
  addonRevenue: number;
  cpa: number;
}

export interface TeamStat {
  team_id: string | null;
  team_name: string;
  revenue: number;
  count: number;
  avgDeal: number;
  cpa: number;
}

export interface LeaderboardFilters {
  carrier?: string;
  product?: string;
  leadSource?: string;
  addon?: string;
  team?: string;
}

export interface LeaderboardData {
  agent_stats: AgentStat[];
  team_stats: TeamStat[];
  teams: LeaderboardTeam[];
  profiles: LeaderboardProfile[];
  filter_options: {
    carriers: string[];
    products: string[];
    lead_sources: string[];
    addons: string[];
  };
  progress: Record<string, AgentProgress>;
  activity: ActivityEvent[];
  meta: { sale_count: number; filtered_sale_count: number };
}

/**
 * Company-wide leaderboard — server-aggregated stats (no raw sales payload).
 */
export async function fetchLeaderboardData(
  from: Date,
  to: Date,
  accessToken?: string,
  filters: LeaderboardFilters = {},
): Promise<LeaderboardData> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  if (filters.carrier && filters.carrier !== "all") params.set("carrier", filters.carrier);
  if (filters.product && filters.product !== "all") params.set("product", filters.product);
  if (filters.leadSource && filters.leadSource !== "all") params.set("lead_source", filters.leadSource);
  if (filters.addon && filters.addon !== "all") params.set("addon", filters.addon);
  if (filters.team && filters.team !== "all") params.set("team", filters.team);

  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(`${API_URL}/leaderboards/?${params.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`Leaderboard request failed (${res.status})`);
  }
  const json = (await res.json()) as Partial<LeaderboardData>;
  return {
    agent_stats: json.agent_stats ?? [],
    team_stats: json.team_stats ?? [],
    teams: json.teams ?? [],
    profiles: json.profiles ?? [],
    filter_options: json.filter_options ?? { carriers: [], products: [], lead_sources: [], addons: [] },
    progress: json.progress ?? {},
    activity: json.activity ?? [],
    meta: json.meta ?? { sale_count: 0, filtered_sale_count: 0 },
  };
}
