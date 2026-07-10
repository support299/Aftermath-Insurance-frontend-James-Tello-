import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Search, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fetchAgentsList, type AgentListRow } from "@/lib/agents";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/sales";
import { useOnSalesChanged } from "@/hooks/use-on-sales-changed";

export const Route = createFileRoute("/_app/agents/")({
  component: AgentsIndexPage,
});

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE_MS = 350;

function AgentsIndexPage() {
  const { roles, loading: authLoading, session } = useAuth();
  const navigate = useNavigate();
  const canManage = roles.includes("admin") || roles.includes("manager");
  const [rows, setRows] = useState<AgentListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState("all");
  const [page, setPage] = useState(1);
  const [teamOptions, setTeamOptions] = useState<{ id: string; name: string }[]>([]);
  const [agentsVersion, setAgentsVersion] = useState(0);
  useOnSalesChanged(() => setAgentsVersion((v) => v + 1));

  useEffect(() => {
    if (!authLoading && !canManage) navigate({ to: "/dashboard" });
  }, [authLoading, canManage, navigate]);

  useEffect(() => {
    if (!canManage) return;
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setTeamOptions((data ?? []) as { id: string; name: string }[]);
      });
  }, [canManage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [team]);

  useEffect(() => {
    if (!canManage || !session?.access_token) return;
    let active = true;
    setLoading(true);

    fetchAgentsList({
      search,
      team,
      page,
      pageSize: PAGE_SIZE,
      accessToken: session.access_token,
    })
      .then((result) => {
        if (!active) return;
        setRows(result.data);
        setTotalCount(result.count);
      })
      .catch((err) => {
        if (!active) return;
        console.error("[agents list]", err);
        setRows([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canManage, session?.access_token, search, team, page, agentsVersion]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

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
            <Input
              className="pl-9"
              placeholder="Type a name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Team</label>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger><SelectValue placeholder="All teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              <SelectItem value="none">Unassigned</SelectItem>
              {teamOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(searchInput || team !== "all") && (
          <div className="sm:col-span-3">
            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); setTeam("all"); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">
            {loading
              ? "Loading…"
              : totalCount === 0
                ? "0 agents"
                : `Showing ${rangeStart}–${rangeEnd} of ${totalCount.toLocaleString()} agent${totalCount === 1 ? "" : "s"}`}
          </h2>
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
              {rows.map((a) => (
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
                  <td className="num px-4 py-3 text-right">{a.sales_count.toLocaleString()}</td>
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
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No agents match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-3 text-sm">
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={loading || page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
