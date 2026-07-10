const API_URL: string = import.meta.env.VITE_API_URL || "/api";

export interface AgentListRow {
  agent_id: string;
  agent_name: string;
  team_id: string | null;
  team_name: string | null;
  sales_count: number;
  revenue: number;
}

export interface AgentListResult {
  data: AgentListRow[];
  count: number;
  page: number;
  page_size: number;
}

export async function fetchAgentsList(params: {
  search?: string;
  team?: string;
  page: number;
  pageSize?: number;
  accessToken?: string;
}): Promise<AgentListResult> {
  const sp = new URLSearchParams({
    page: String(params.page),
    page_size: String(params.pageSize ?? 15),
  });
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.team && params.team !== "all") sp.set("team", params.team);

  const headers: Record<string, string> = {};
  if (params.accessToken) headers.Authorization = `Bearer ${params.accessToken}`;

  const res = await fetch(`${API_URL}/agents/?${sp.toString()}`, { headers });
  if (!res.ok) {
    throw new Error(`Agents request failed (${res.status})`);
  }
  return (await res.json()) as AgentListResult;
}
