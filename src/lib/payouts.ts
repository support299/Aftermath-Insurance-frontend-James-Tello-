const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface CompLevel {
  id: string;
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductCommissionRow {
  id: string;
  product_id: string | null;
  add_on_id: string | null;
  label: string;
  product_name: string | null;
  add_on_name: string | null;
  carrier_name: string | null;
  advance_months: number;
  rates: Record<string, number>;
  is_active: boolean;
}

export interface PayoutEstimateLine {
  product: string;
  kind: string;
  monthly_premium: number;
  advance_months: number;
  rate: number;
  estimated_check: number;
  matched: boolean;
}

export interface PayoutEstimate {
  level_code: string | null;
  estimated_payout: number;
  lines: PayoutEstimateLine[];
}

export interface TrackerWeek {
  week: number;
  submitted: number;
  is_current: boolean;
}

export interface TrackerPayload {
  active: boolean;
  reason: string | null;
  first_sale_at: string | null;
  current_week: number;
  phase: number | null;
  phase_label: string | null;
  phase_goal: number;
  phase_submitted: number;
  phase_pct: number;
  projection: number;
  weeks: TrackerWeek[];
  foundation_weeks: number;
  beacon_weeks: number;
}

export interface IncomeGoalPayload {
  annual_income_goal: number;
  blended_rate: number;
  business_needed: number;
  submitted_ytd: number;
  expected_income_blended: number;
  estimated_payout_ytd: number;
  progress_pct: number;
}

export interface MilestoneItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  milestone_type: string;
  threshold: number;
  cash_reward: number;
  earned: boolean;
  awarded_at: string | null;
}

export interface OnboardingDashboard {
  tracker: TrackerPayload;
  income_goal: IncomeGoalPayload;
  milestones: {
    sale_count: number;
    submitted_ap: number;
    milestones: MilestoneItem[];
  };
  comp_level: { code: string | null };
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

export async function fetchCommissionsCatalog(accessToken?: string): Promise<{
  levels: CompLevel[];
  my_level_code: string | null;
  commissions: ProductCommissionRow[];
}> {
  const res = await fetch(`${API_URL}/payouts/commissions/catalog/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function estimatePayout(
  lineItems: unknown[],
  accessToken?: string,
  agentId?: string,
): Promise<PayoutEstimate> {
  const res = await fetch(`${API_URL}/payouts/estimate/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ line_items: lineItems, agent_id: agentId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function recalcSalePayout(
  saleUuid: string,
  accessToken?: string,
): Promise<PayoutEstimate & { new_milestones?: { name: string; cash_reward: number }[] }> {
  const res = await fetch(`${API_URL}/payouts/sales/${saleUuid}/recalc/`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchOnboardingDashboard(
  accessToken?: string,
  agentId?: string,
): Promise<OnboardingDashboard> {
  const path = agentId
    ? `${API_URL}/payouts/onboarding/${agentId}/`
    : `${API_URL}/payouts/onboarding/`;
  const res = await fetch(path, { headers: authHeaders(accessToken) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateIncomeGoal(
  annualIncomeGoal: number,
  accessToken?: string,
  agentId?: string,
): Promise<IncomeGoalPayload> {
  const path = agentId
    ? `${API_URL}/payouts/income-goal/${agentId}/`
    : `${API_URL}/payouts/income-goal/`;
  const res = await fetch(path, {
    method: "PUT",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ annual_income_goal: annualIncomeGoal }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// Admin

export async function fetchAdminCommissions(accessToken?: string): Promise<{
  commissions: ProductCommissionRow[];
  levels: CompLevel[];
}> {
  const res = await fetch(`${API_URL}/payouts/admin/commissions/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createCommission(
  body: {
    product_id?: string | null;
    add_on_id?: string | null;
    advance_months: number;
    rates: Record<string, number>;
    label?: string;
  },
  accessToken?: string,
): Promise<ProductCommissionRow> {
  const res = await fetch(`${API_URL}/payouts/admin/commissions/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateCommission(
  id: string,
  body: Partial<{
    advance_months: number;
    rates: Record<string, number>;
    label: string;
    is_active: boolean;
  }>,
  accessToken?: string,
): Promise<ProductCommissionRow> {
  const res = await fetch(`${API_URL}/payouts/admin/commissions/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchAdminCompLevels(accessToken?: string): Promise<CompLevel[]> {
  const res = await fetch(`${API_URL}/payouts/admin/comp-levels/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const json = (await res.json()) as { levels?: CompLevel[] };
  return json.levels ?? [];
}

export async function createCompLevel(
  body: { code: string; name: string; sort_order?: number },
  accessToken?: string,
): Promise<CompLevel> {
  const res = await fetch(`${API_URL}/payouts/admin/comp-levels/`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function setAgentCompLevel(
  agentId: string,
  compLevelId: string | null,
  accessToken?: string,
): Promise<{ comp_level_id: string | null; code: string | null; name: string | null }> {
  const res = await fetch(`${API_URL}/payouts/admin/agents/${agentId}/comp-level/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ comp_level_id: compLevelId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchAdminMilestones(accessToken?: string) {
  const res = await fetch(`${API_URL}/payouts/admin/milestones/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    milestones: Array<{
      id: string;
      slug: string;
      name: string;
      description: string;
      milestone_type: string;
      threshold: number;
      cash_reward: number;
      sort_order: number;
      is_active: boolean;
    }>;
  }>;
}

export async function updateAdminMilestone(
  id: string,
  body: Record<string, unknown>,
  accessToken?: string,
) {
  const res = await fetch(`${API_URL}/payouts/admin/milestones/${id}/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchTrackerConfig(accessToken?: string) {
  const res = await fetch(`${API_URL}/payouts/admin/tracker-config/`, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    foundation_weeks: number;
    beacon_weeks: number;
    phase_goal: number;
    blended_income_rate: number;
  }>;
}

export async function updateTrackerConfig(
  body: Partial<{
    foundation_weeks: number;
    beacon_weeks: number;
    phase_goal: number;
    blended_income_rate: number;
  }>,
  accessToken?: string,
) {
  const res = await fetch(`${API_URL}/payouts/admin/tracker-config/`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

/** Client-side estimate using catalog (avoids debounce churn on every keypress). */
export function calcLocalPayout(
  lineItems: {
    kind: string;
    carrier: string;
    product: string;
    monthly_premium: string;
    amount: string;
    additional_price?: string;
  }[],
  commissions: ProductCommissionRow[],
  levelCode: string | null,
): PayoutEstimate {
  const byProductId = new Map(commissions.filter((c) => c.product_id).map((c) => [c.product_id!, c]));
  const byAddonId = new Map(commissions.filter((c) => c.add_on_id).map((c) => [c.add_on_id!, c]));
  const byName = new Map(
    commissions.map((c) => [(c.product_name || c.add_on_name || c.label || "").toLowerCase(), c]),
  );

  const lines: PayoutEstimateLine[] = [];
  let total = 0;

  for (const li of lineItems) {
    if (!li.product) continue;
    const monthlyBase = Number(li.monthly_premium);
    const extra = Number(li.additional_price) || 0;
    let monthly =
      li.monthly_premium !== "" && isFinite(monthlyBase)
        ? monthlyBase + extra
        : li.amount !== "" && isFinite(Number(li.amount))
          ? Number(li.amount) / 12
          : 0;

    const nameKey = li.product.toLowerCase();
    const commission = byName.get(nameKey) ?? null;
    // Prefer name match; product_id match needs map from form — name is enough for UI
    void byProductId;
    void byAddonId;

    const months = commission?.advance_months ?? 0;
    const rate = levelCode && commission ? Number(commission.rates?.[levelCode] ?? 0) : 0;
    const check = +(monthly * months * rate).toFixed(2);
    total += check;
    lines.push({
      product: li.product,
      kind: li.kind,
      monthly_premium: +monthly.toFixed(2),
      advance_months: months,
      rate,
      estimated_check: check,
      matched: !!commission,
    });
  }

  return { level_code: levelCode, estimated_payout: +total.toFixed(2), lines };
}
