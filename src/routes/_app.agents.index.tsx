import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/sales";

export const Route = createFileRoute("/_app/agents/")({
  component: AgentsIndexPage,
});

interface AgentRow {
  agent_id: string;
  agent_name: string;
  team_id: string | null;
  team_name: string | null;
  sales_count: number;
  revenue: number;
}

function AgentsIndexPage() {
  const { roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const canManage = roles.includes("admin") || roles.includes("manager");
  const [rows, setRows] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");

  useEffect(() => {
    if (!authLoading && !canManage) navigate({ to: "/dashboard" });
  }, [authLoading, canManage, navigate]);

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from("profiles").select("id, display_name, team_id, teams:team_id(name)"),
      supabase.from("sales").select("agent_id, deal_size"),
    ]).then(([profilesRes, salesRes]) => {
      if (!active) return;
      const totals = new Map<string, { count: number; revenue: number }>();
      (salesRes.data ?? []).forEach((s: any) => {
        const cur = totals.get(s.agent_id) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += Number(s.deal_size) || 0;
        totals.set(s.agent_id, cur);
      });
      const list: AgentRow[] = (profilesRes.data ?? []).map((p: any) => ({
        agent_id: p.id,
        agent_name: p.display_name,
        team_id: p.team_id ?? null,
        team_name: p.teams?.name ?? "Unassigned",
        sales_count: (totals.get(p.id)?.count) ?? 0,
        revenue: (totals.get(p.id)?.revenue) ?? 0,
      }));
      list.sort((a, b) => b.revenue - a.revenue || a.agent_name.localeCompare(b.agent_name));
      setRows(list);
      setLoading(false);
    });
    return () => { active = false; };
  }, [canManage]);

  const teamOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => m.set(r.team_id ?? "none", r.team_name ?? "Unassigned"));
    return [...m.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (team !== "all" && (r.team_id ?? "none") !== team) return false;
      if (search && !r.agent_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, search, team]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Agents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Select an agent to view their dedicated dashboard.</p>
      </div>

      <div className="surface-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Search agent</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Type a name…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Team</label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger><SelectValue placeholder="All teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teamOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(search || team !== "all") && (
          <div className="sm:col-span-3">
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setTeam("all"); }}>Clear filters</Button>
          </div>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">{filtered.length} agent{filtered.length === 1 ? "" : "s"}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Sales</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.agent_id} className="border-t border-border/50 hover:bg-secondary/30">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs">
                        <Users className="h-3.5 w-3.5" />
                      </div>
                      {a.agent_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.team_name ?? "Unassigned"}</td>
                  <td className="num px-4 py-3 text-right">{a.sales_count}</td>
                  <td className="num px-4 py-3 text-right font-medium">{formatCurrency(a.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/agents/$agentId" params={{ agentId: a.agent_id }}>
                        View <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No agents match your filters.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
