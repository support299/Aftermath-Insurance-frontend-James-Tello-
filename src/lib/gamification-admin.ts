const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface AdminReward {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  points_cost: number;
  sort_order: number;
  is_active: boolean;
  team_id: string | null;
  team_name: string | null;
  scope: "global" | "team";
  created_at: string;
}

export interface AdminContest {
  id: string;
  title: string;
  description: string;
  prize_description: string;
  metric: string;
  target_value: number | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  team_id: string | null;
  team_name: string | null;
  scope: "global" | "team";
  created_at: string;
  updated_at: string;
}

export interface AdminAchievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  metric: string;
  period: string;
  threshold: number | null;
  sort_order: number;
  is_active: boolean;
  points_reward: number | null;
  rule: string;
  trigger: string;
  trigger_label: string;
  display_hint: string;
  implemented: boolean;
}

export interface AdminRedemption {
  id: string;
  agent_id: string;
  agent_email: string;
  agent_name?: string;
  reward_id: string;
  reward_name: string;
  reward_icon: string;
  points_cost: number;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  agent_note: string;
  admin_note: string;
  team_id?: string | null;
  team_name?: string | null;
  scope?: "global" | "team";
  created_at: string;
  reviewed_at: string | null;
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

export async function fetchAdminRewards(accessToken?: string): Promise<AdminReward[]> {
  const res = await fetch(`${API_URL}/gamification/admin/rewards/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { rewards?: AdminReward[] };
  return json.rewards ?? [];
}

export async function createAdminReward(
  payload: Partial<AdminReward>,
  accessToken?: string,
): Promise<AdminReward> {
  const res = await fetch(`${API_URL}/gamification/admin/rewards/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminReward;
}

export async function updateAdminReward(
  id: string,
  payload: Partial<AdminReward>,
  accessToken?: string,
): Promise<AdminReward> {
  const res = await fetch(`${API_URL}/gamification/admin/rewards/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminReward;
}

export async function deactivateAdminReward(id: string, accessToken?: string): Promise<void> {
  const res = await fetch(`${API_URL}/gamification/admin/rewards/${id}/`, {
    method: "DELETE",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function fetchAdminContests(accessToken?: string): Promise<AdminContest[]> {
  const res = await fetch(`${API_URL}/gamification/admin/contests/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { contests?: AdminContest[] };
  return json.contests ?? [];
}

export async function createAdminContest(
  payload: Partial<AdminContest>,
  accessToken?: string,
): Promise<AdminContest> {
  const res = await fetch(`${API_URL}/gamification/admin/contests/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminContest;
}

export async function updateAdminContest(
  id: string,
  payload: Partial<AdminContest>,
  accessToken?: string,
): Promise<AdminContest> {
  const res = await fetch(`${API_URL}/gamification/admin/contests/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminContest;
}

export async function fetchAdminAchievements(accessToken?: string): Promise<AdminAchievement[]> {
  const res = await fetch(`${API_URL}/gamification/admin/achievements/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { achievements?: AdminAchievement[] };
  return json.achievements ?? [];
}

export async function updateAdminAchievement(
  id: string,
  payload: Partial<AdminAchievement>,
  accessToken?: string,
): Promise<AdminAchievement> {
  const res = await fetch(`${API_URL}/gamification/admin/achievements/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminAchievement;
}

export async function fetchAdminRedemptions(
  status: "pending" | "all" | "approved" | "rejected" | "fulfilled" = "pending",
  accessToken?: string,
): Promise<AdminRedemption[]> {
  const res = await fetch(`${API_URL}/gamification/admin/redemptions/?status=${status}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { redemptions?: AdminRedemption[] };
  return json.redemptions ?? [];
}

export async function reviewAdminRedemption(
  id: string,
  status: AdminRedemption["status"],
  adminNote: string,
  accessToken?: string,
): Promise<AdminRedemption> {
  const res = await fetch(`${API_URL}/gamification/admin/redemptions/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ status, admin_note: adminNote }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminRedemption;
}

export async function runAchievementEvaluation(
  monthly = false,
  accessToken?: string,
): Promise<{ awarded: number; elapsedMs?: number }> {
  const res = await fetch(`${API_URL}/gamification/admin/evaluate-achievements/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ monthly }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { awarded?: number; elapsed_ms?: number };
  return { awarded: json.awarded ?? 0, elapsedMs: json.elapsed_ms };
}

export const CONTEST_METRICS = [
  { value: "revenue", label: "Total revenue" },
  { value: "sale_count", label: "Sale count" },
  { value: "life_revenue", label: "Life premium" },
  { value: "addon_revenue", label: "Add-on premium" },
] as const;

export interface EarningRules {
  xp_total_premium_mult: number;
  xp_life_bonus_mult: number;
  xp_health_bonus_mult: number;
  xp_addon_bonus_mult: number;
  xp_per_sale_base: number;
  points_per_sale_base: number;
  points_per_100_premium: number;
  points_per_sale_min: number;
  default_badge_points: number;
}

export interface WeeklyChallengeDef {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  points: number;
  is_active: boolean;
  sort_order: number;
}

export interface AdminLevel {
  id: string;
  rank: number;
  slug: string;
  name: string;
  xp_required: number;
  tier_type: string;
  description: string;
}

export interface AdminAgentProgress {
  agent_id: string;
  display_name: string;
  email: string;
  team_name: string | null;
  total_xp: number;
  sales_xp: number;
  bonus_xp?: number;
  points_balance: number;
  level_name: string;
  level_rank: number;
  level_tier?: string;
}

export async function fetchGamificationConfig(accessToken?: string): Promise<{
  earning_rules: EarningRules;
  weekly_challenges: WeeklyChallengeDef[];
}> {
  const res = await fetch(`${API_URL}/gamification/admin/config/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { earning_rules: EarningRules; weekly_challenges: WeeklyChallengeDef[] };
}

export async function updateGamificationConfig(
  payload: Partial<{ earning_rules: Partial<EarningRules>; weekly_challenges: WeeklyChallengeDef[] }>,
  accessToken?: string,
): Promise<{ earning_rules: EarningRules; weekly_challenges: WeeklyChallengeDef[] }> {
  const res = await fetch(`${API_URL}/gamification/admin/config/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { earning_rules: EarningRules; weekly_challenges: WeeklyChallengeDef[] };
}

export async function fetchAdminLevels(accessToken?: string): Promise<AdminLevel[]> {
  const res = await fetch(`${API_URL}/gamification/admin/levels/`, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { levels?: AdminLevel[] };
  return json.levels ?? [];
}

export async function updateAdminLevel(
  id: string,
  payload: Partial<AdminLevel>,
  accessToken?: string,
): Promise<AdminLevel> {
  const res = await fetch(`${API_URL}/gamification/admin/levels/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as AdminLevel;
}

export async function fetchAdminAgentProgress(
  search = "",
  accessToken?: string,
  page = 1,
  pageSize = 25,
): Promise<{ agents: AdminAgentProgress[]; total: number; page: number; page_size: number }> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page", String(page));
  params.set("page_size", String(pageSize));
  const res = await fetch(`${API_URL}/gamification/admin/agent-progress?${params}`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { agents: AdminAgentProgress[]; total: number; page: number; page_size: number };
}

export async function adjustAgentPoints(
  agentId: string,
  amount: number,
  note: string,
  accessToken?: string,
): Promise<number> {
  const res = await fetch(`${API_URL}/gamification/admin/agent-progress/${agentId}/adjust-points/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ amount, note }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { points_balance?: number };
  return json.points_balance ?? 0;
}

export async function adjustAgentXp(
  agentId: string,
  amount: number,
  accessToken?: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/gamification/admin/agent-progress/${agentId}/adjust-xp/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function recalculateAllGamification(accessToken?: string): Promise<number> {
  const res = await fetch(`${API_URL}/gamification/admin/recalculate-all/`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { recalculated?: number };
  return json.recalculated ?? 0;
}

export const CHALLENGE_METRICS = [
  { value: "health_policies", label: "Health policies closed" },
  { value: "sale_days", label: "Days with sales logged" },
  { value: "addon_deals", label: "Deals with add-ons" },
] as const;
