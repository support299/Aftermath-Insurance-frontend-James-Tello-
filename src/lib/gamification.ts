const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface AgentProgress {
  agent_id: string;
  total_xp: number;
  level_rank: number;
  level_slug: string;
  level_name: string;
  level_tier: "level" | "prestige" | "hof";
  xp_to_next: number;
  next_level_name: string | null;
  level_progress_pct: number;
  current_streak: number;
  best_streak: number;
  points_balance?: number;
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  agent_id: string | null;
  agent_name: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface LevelInfo {
  rank: number;
  slug: string;
  name: string;
  xp_required: number;
  tier_type: string;
  description: string;
}

export interface BadgeInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
  period: string;
  period_label: string;
  /** @deprecated use earned_ever */
  earned: boolean;
  earned_ever: boolean;
  earned_current_period: boolean;
  times_earned: number;
  status_label: string | null;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  points: number;
}

export interface ContestInfo {
  id: string;
  title: string;
  description: string;
  prize_description: string;
  metric: string;
  start_date: string;
  end_date: string;
  target_value: number | null;
  current: number;
  target: number | null;
  progress_pct: number | null;
  team_name: string | null;
  scope: "global" | "team";
}

export interface RewardInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  points_cost: number;
  can_afford: boolean;
  team_name?: string | null;
  scope?: "global" | "team";
}

export interface RedemptionInfo {
  id: string;
  reward_id: string;
  reward_name: string;
  reward_icon: string;
  points_cost: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  agent_note: string;
  admin_note: string;
  team_name?: string | null;
  scope?: "global" | "team";
  created_at: string;
  reviewed_at: string | null;
}

export interface IncentivesData {
  progress: AgentProgress;
  levels: LevelInfo[];
  badges: BadgeInfo[];
  badges_summary: {
    earned: number;
    earned_ever: number;
    earned_current_period: number;
    total: number;
  };
  contests: ContestInfo[];
  weekly_challenges: WeeklyChallenge[];
  points_balance: number;
  earning_rules: {
    xp_total_premium_mult: number;
    xp_life_bonus_mult: number;
    xp_health_bonus_mult: number;
    xp_addon_bonus_mult: number;
    xp_per_sale_base: number;
    points_per_sale_base: number;
    points_per_100_premium: number;
    points_per_sale_min: number;
    default_badge_points: number;
  };
  rewards: RewardInfo[];
  redemptions: RedemptionInfo[];
}

function authHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

export async function fetchAllProgress(accessToken?: string): Promise<Record<string, AgentProgress>> {
  const res = await fetch(`${API_URL}/gamification/progress/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`Progress request failed (${res.status})`);
  const json = (await res.json()) as { progress?: Record<string, AgentProgress> };
  return json.progress ?? {};
}

export async function fetchMyProgress(accessToken?: string): Promise<AgentProgress> {
  const res = await fetch(`${API_URL}/gamification/me/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(`My progress request failed (${res.status})`);
  return (await res.json()) as AgentProgress;
}

export async function fetchIncentives(accessToken?: string): Promise<IncentivesData> {
  const res = await fetch(`${API_URL}/gamification/incentives/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Incentives request failed (${res.status})`);
  return (await res.json()) as IncentivesData;
}

export async function fetchActivityFeed(limit = 20, accessToken?: string): Promise<ActivityEvent[]> {
  const res = await fetch(`${API_URL}/gamification/activity/?limit=${limit}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(`Activity request failed (${res.status})`);
  const json = (await res.json()) as { events?: ActivityEvent[] };
  return json.events ?? [];
}

export interface RedeemResult {
  id: string;
  status: RedemptionInfo["status"];
  points_cost: number;
  reward_name: string;
}

export async function redeemReward(
  rewardId: string,
  accessToken?: string,
  note?: string,
): Promise<RedeemResult> {
  const res = await fetch(`${API_URL}/gamification/rewards/${rewardId}/redeem/`, {
    method: "POST",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ note: note ?? "" }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Redeem failed (${res.status})`);
  }
  const json = (await res.json()) as {
    id: string;
    status: string;
    points_cost: number;
    reward_name: string;
  };
  return {
    id: json.id,
    status: json.status as RedemptionInfo["status"],
    points_cost: json.points_cost,
    reward_name: json.reward_name,
  };
}

export function agentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function tierColor(tier: AgentProgress["level_tier"]): string {
  switch (tier) {
    case "hof":
      return "var(--gold)";
    case "prestige":
      return "var(--warning)";
    default:
      return "var(--primary)";
  }
}

/** Crest asset keys for James's XP rank logos (5 metals across the ladder). */
export type RankCrestKey = "bronze" | "silver" | "gold" | "prestige" | "hof";

/** Friendly metal names shown under XP ranks (not tied to Prestige/HOF level names). */
export const RANK_CREST_LABEL: Record<RankCrestKey, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  prestige: "Platinum",
  hof: "Mythic",
};

/**
 * Map XP ladder rank → crest.
 * Spreads all 5 logos across the main 9 ranks (minimal repeats):
 *   1–2 Bronze · 3–4 Silver · 5–6 Gold · 7–8 Platinum · 9 Mythic
 * Ranks 10+ (extended ladder) keep Platinum, then Mythic at the top.
 */
export function crestKeyForRank(rank: number, tierType?: string): RankCrestKey {
  if (tierType === "hof" || rank >= 15) return "hof";
  if (rank <= 2) return "bronze";
  if (rank <= 4) return "silver";
  if (rank <= 6) return "gold";
  if (rank <= 8) return "prestige";
  if (rank === 9) return "hof";
  // ranks 10–14 (extended XP ladder)
  return "prestige";
}

export function rankCrestKey(
  progress: Pick<AgentProgress, "level_rank" | "level_tier"> | null | undefined,
): RankCrestKey | null {
  if (!progress || !progress.level_rank || progress.level_rank <= 0) return null;
  return crestKeyForRank(progress.level_rank, progress.level_tier);
}

export function rankCrestSrc(key: RankCrestKey): string {
  return `/ranks/${key}.png`;
}

export function rankCrestForLevel(level: {
  rank: number;
  tier_type: string;
}): RankCrestKey {
  return crestKeyForRank(level.rank, level.tier_type);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
