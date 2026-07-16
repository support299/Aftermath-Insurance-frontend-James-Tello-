import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Crown, Medal, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCompanySettings } from "@/lib/company-settings";
import { formatCurrency } from "@/lib/sales";
import { rangeFromKey, type DateRangeKey } from "@/lib/metrics";
import {
  fetchLeaderboardData,
  type AgentStat,
  type TeamStat,
} from "@/lib/leaderboard";
import type { ActivityEvent, AgentProgress } from "@/lib/gamification";
import { LIVE_REFRESH_MS } from "@/lib/sales-events";
import { useOnSalesChanged } from "@/hooks/use-on-sales-changed";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { TeamBattleBar, type TeamBattleSide } from "@/components/gamification/TeamBattleBar";
import { MvpSpotlight } from "@/components/gamification/MvpSpotlight";
import { LiveActivityFeed } from "@/components/gamification/LiveActivityFeed";
import { TopAgentsBoard } from "@/components/gamification/TopAgentsBoard";
import { TopTeamsBoard } from "@/components/gamification/TopTeamsBoard";
import { AgentRankMark } from "@/components/gamification/AgentRankMark";
import { LevelBadge } from "@/components/gamification/LevelBadge";

export const Route = createFileRoute("/_app/leaderboards")({
  component: LeaderboardsPage,
});

const TIMEFRAMES: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const PAGE_SIZES = [10, 20, 30, 50, 100] as const;

function LeaderboardsPage() {
  const { user, session, profile } = useAuth();
  const { reportingTimezone } = useCompanySettings();
  const [timeframe, setTimeframe] = usePersistentState<DateRangeKey>("lb.timeframe", "week");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [agentStats, setAgentStats] = useState<AgentStat[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    carriers: [] as string[],
    products: [] as string[],
    lead_sources: [] as string[],
    addons: [] as string[],
  });
  const [progressByAgent, setProgressByAgent] = useState<Record<string, AgentProgress>>({});
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  const [agentSearch, setAgentSearch] = usePersistentState<string>("lb.agentSearch", "");
  const [teamFilter, setTeamFilter] = usePersistentState<string>("lb.team", "all");
  const [carrierFilter, setCarrierFilter] = usePersistentState<string>("lb.v2.carrier", "all");
  const [productFilter, setProductFilter] = usePersistentState<string>("lb.v2.product", "all");
  const [leadSourceFilter, setLeadSourceFilter] = usePersistentState<string>("lb.v2.leadSource", "all");
  const [addonFilter, setAddonFilter] = usePersistentState<string>("lb.v2.addon", "all");
  const [agentPage, setAgentPage] = useState(1);
  const [agentPageSize, setAgentPageSize] = usePersistentState<number>("lb.agentPageSize", 10);
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = usePersistentState<number>("lb.teamPageSize", 10);
  const [leaderboardMeta, setLeaderboardMeta] = useState({ sale_count: 0, filtered_sale_count: 0 });

  const range = useMemo(
    () => rangeFromKey(timeframe, { from: customFrom, to: customTo }),
    [timeframe, customFrom, customTo, reportingTimezone],
  );

  const apiFilters = useMemo(() => {
    const carrier =
      carrierFilter !== "all" && !filterOptions.carriers.includes(carrierFilter) ? "all" : carrierFilter;
    const product =
      productFilter !== "all" && !filterOptions.products.includes(productFilter) ? "all" : productFilter;
    const leadSource =
      leadSourceFilter !== "all" && !filterOptions.lead_sources.includes(leadSourceFilter)
        ? "all"
        : leadSourceFilter;
    const addon =
      addonFilter !== "all" &&
      addonFilter !== "__none" &&
      !filterOptions.addons.includes(addonFilter)
        ? "all"
        : addonFilter;
    return { carrier, product, leadSource, addon };
  }, [carrierFilter, productFilter, leadSourceFilter, addonFilter, filterOptions]);

  // Drop stale localStorage filter values that no longer exist in the current period.
  useEffect(() => {
    if (carrierFilter !== "all" && filterOptions.carriers.length > 0 && !filterOptions.carriers.includes(carrierFilter)) {
      setCarrierFilter("all");
    }
    if (productFilter !== "all" && filterOptions.products.length > 0 && !filterOptions.products.includes(productFilter)) {
      setProductFilter("all");
    }
    if (
      leadSourceFilter !== "all" &&
      filterOptions.lead_sources.length > 0 &&
      !filterOptions.lead_sources.includes(leadSourceFilter)
    ) {
      setLeadSourceFilter("all");
    }
    if (
      addonFilter !== "all" &&
      addonFilter !== "__none" &&
      filterOptions.addons.length > 0 &&
      !filterOptions.addons.includes(addonFilter)
    ) {
      setAddonFilter("all");
    }
  }, [
    carrierFilter,
    productFilter,
    leadSourceFilter,
    addonFilter,
    filterOptions,
    setCarrierFilter,
    setProductFilter,
    setLeadSourceFilter,
    setAddonFilter,
  ]);

  const load = useCallback(() => {
    setLoading(true);
    fetchLeaderboardData(range.from, range.to, session?.access_token, apiFilters)
      .then((data) => {
        setAgentStats(data.agent_stats);
        setTeamStats(data.team_stats);
        setFilterOptions(data.filter_options);
        setProgressByAgent(data.progress);
        setActivity(data.activity);
        setLeaderboardMeta(data.meta);
        setRefreshedAt(new Date());
      })
      .catch((err) => {
        console.error("[Leaderboards]", err);
      })
      .finally(() => setLoading(false));
  }, [range.from, range.to, session?.access_token, apiFilters]);

  useEffect(() => {
    load();
    const t = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(t);
  }, [load, reportingTimezone]);

  useOnSalesChanged(load);

  const teamOptions = useMemo(
    () => teamStats.map((t) => ({ id: t.team_id ?? "none", name: t.team_name })),
    [teamStats],
  );

  const filteredAgents = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    return agentStats.filter((a) => {
      if (q && !a.agent_name.toLowerCase().includes(q)) return false;
      if (teamFilter !== "all") {
        const id = a.team_id ?? "none";
        if (id !== teamFilter) return false;
      }
      return true;
    });
  }, [agentStats, agentSearch, teamFilter]);

  const hasExtraFilters =
    apiFilters.carrier !== "all" ||
    apiFilters.product !== "all" ||
    apiFilters.leadSource !== "all" ||
    apiFilters.addon !== "all";

  const filtersHidingResults =
    leaderboardMeta.sale_count > 0 && leaderboardMeta.filtered_sale_count === 0 && hasExtraFilters;

  const agentPageCount = Math.max(1, Math.ceil(filteredAgents.length / agentPageSize));
  const currentAgentPage = Math.min(agentPage, agentPageCount);
  const paginatedAgents = filteredAgents.slice(
    (currentAgentPage - 1) * agentPageSize,
    currentAgentPage * agentPageSize,
  );
  const teamPageCount = Math.max(1, Math.ceil(teamStats.length / teamPageSize));
  const currentTeamPage = Math.min(teamPage, teamPageCount);
  const paginatedTeams = teamStats.slice(
    (currentTeamPage - 1) * teamPageSize,
    currentTeamPage * teamPageSize,
  );

  const agentsPerTeam = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    agentStats.forEach((a) => {
      if (a.count === 0) return;
      const key = a.team_id ?? "none";
      if (!counts.has(key)) counts.set(key, new Set());
      counts.get(key)!.add(a.agent_id);
    });
    const out = new Map<string, number>();
    counts.forEach((set, key) => out.set(key, set.size));
    return out;
  }, [agentStats]);

  const teamBattle = useMemo((): { left: TeamBattleSide; right: TeamBattleSide } | null => {
    if (teamStats.length < 2) return null;
    const [a, b] = teamStats;
    return {
      left: {
        team_id: a.team_id ?? "none",
        team_name: a.team_name,
        revenue: a.revenue,
        agent_count: agentsPerTeam.get(a.team_id ?? "none") ?? 0,
      },
      right: {
        team_id: b.team_id ?? "none",
        team_name: b.team_name,
        revenue: b.revenue,
        agent_count: agentsPerTeam.get(b.team_id ?? "none") ?? 0,
      },
    };
  }, [teamStats, agentsPerTeam]);

  const mvp = filteredAgents.find((a) => a.count > 0) ?? filteredAgents[0] ?? null;
  const rankedForBoard = useMemo(
    () =>
      filteredAgents
        .filter((a) => a.count > 0)
        .map((a) => ({
          agent_id: a.agent_id,
          agent_name: a.agent_name,
          revenue: a.revenue,
          count: a.count,
          progress: progressByAgent[a.agent_id] ?? null,
        })),
    [filteredAgents, progressByAgent],
  );

  const rankedForTeams = useMemo(
    () =>
      teamStats.map((t) => ({
        team_id: t.team_id,
        team_name: t.team_name,
        revenue: t.revenue,
        count: t.count,
        avgDeal: t.avgDeal,
        cpa: t.cpa,
        agent_count: agentsPerTeam.get(t.team_id ?? "none") ?? 0,
      })),
    [teamStats, agentsPerTeam],
  );

  const myTeamId = profile?.team_id ?? null;
  const weeklyGoal = teamBattle ? (teamBattle.left.revenue + teamBattle.right.revenue) * 1.5 : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Leaderboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compete live — team battles, streaks, and levels. Auto-refreshes every minute.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden text-xs text-muted-foreground sm:block">
            Updated {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTimeframe(t.key)}
            className={
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
              (timeframe === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtersHidingResults && (
        <div className="surface-card flex flex-wrap items-center justify-between gap-3 border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4 text-sm">
          <p>
            Filters are hiding all <strong>{leaderboardMeta.sale_count}</strong> sales in this period.
            Clear filters to see leaderboard data.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setCarrierFilter("all");
              setProductFilter("all");
              setLeadSourceFilter("all");
              setAddonFilter("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {timeframe === "custom" && (
        <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <DateField label="From" value={customFrom} onChange={setCustomFrom} max={customTo} />
          <DateField label="To" value={customTo} onChange={setCustomTo} min={customFrom} />
        </div>
      )}

      <div className="surface-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Carrier</label>
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger><SelectValue placeholder="All carriers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All carriers</SelectItem>
              {filterOptions.carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Product</label>
          <Select value={productFilter} onValueChange={setProductFilter}>
            <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {filterOptions.products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Add-on</label>
          <Select value={addonFilter} onValueChange={setAddonFilter}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any add-on</SelectItem>
              <SelectItem value="__none">No add-ons</SelectItem>
              {filterOptions.addons.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Lead source</label>
          <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter}>
            <SelectTrigger><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {filterOptions.lead_sources.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {hasExtraFilters && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCarrierFilter("all");
                setProductFilter("all");
                setLeadSourceFilter("all");
                setAddonFilter("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {loading && agentStats.length === 0 ? (
        <div className="game-panel p-8 text-center text-sm text-muted-foreground">Loading leaderboard…</div>
      ) : (
        <>
          {teamBattle && (
            <TeamBattleBar left={teamBattle.left} right={teamBattle.right} weeklyGoal={weeklyGoal} />
          )}

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {mvp && (
              <MvpSpotlight
                name={mvp.agent_name}
                revenue={mvp.revenue}
                salesCount={mvp.count}
                progress={progressByAgent[mvp.agent_id]}
                tags={["Rank #1 this week", mvp.lifeCount > 0 ? "Life policies" : null, "Top performer"].filter(
                  (x): x is string => !!x,
                )}
              />
            )}
            <LiveActivityFeed events={activity} loading={loading} />
          </div>

          <TopAgentsBoard agents={rankedForBoard} highlightId={user?.id} />
          <TopTeamsBoard teams={rankedForTeams} highlightTeamId={myTeamId} />
        </>
      )}

      <Tabs defaultValue="agents">
        <TabsList>
          <TabsTrigger value="agents">Full Stats — Agents</TabsTrigger>
          <TabsTrigger value="teams">Full Stats — Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              placeholder="Search agent…"
              value={agentSearch}
              onChange={(e) => { setAgentSearch(e.target.value); setAgentPage(1); }}
              className="sm:max-w-xs"
            />
            <Select value={teamFilter} onValueChange={(value) => { setTeamFilter(value); setAgentPage(1); }}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {teamOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(agentSearch || teamFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setAgentSearch(""); setTeamFilter("all"); setAgentPage(1); }}>
                Clear
              </Button>
            )}
          </div>
          <div className="game-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Agent</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-right">Total $</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Avg Deal</th>
                    <th className="px-4 py-3 text-right">Life Count</th>
                    <th className="px-4 py-3 text-right">Life $</th>
                    <th className="px-4 py-3 text-right">Health Count</th>
                    <th className="px-4 py-3 text-right">Health $</th>
                    <th className="px-4 py-3 text-right">Addons</th>
                    <th className="px-4 py-3 text-right">Addons $</th>
                    <th className="px-4 py-3 text-right">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAgents.map((a, i) => (
                    <Row key={a.agent_id} rank={(currentAgentPage - 1) * agentPageSize + i + 1} highlight={a.agent_id === user?.id}>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <AgentRankMark progress={progressByAgent[a.agent_id]} size="sm" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate">{a.agent_name}</span>
                              <LevelBadge progress={progressByAgent[a.agent_id]} showCrest={false} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{a.team_name}</td>
                      <td className="num px-4 py-3 text-right font-semibold">{formatCurrency(a.revenue)}</td>
                      <td className="num px-4 py-3 text-right">{a.count}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(a.avgDeal)}</td>
                      <td className="num px-4 py-3 text-right">{a.lifeCount}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(a.lifeRevenue)}</td>
                      <td className="num px-4 py-3 text-right">{a.healthCount}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(a.healthRevenue)}</td>
                      <td className="num px-4 py-3 text-right">{a.addonCount}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(a.addonRevenue)}</td>
                      <td className="num px-4 py-3 text-right">{formatCurrency(a.cpa)}</td>
                    </Row>
                  ))}
                  {!loading && filteredAgents.length === 0 && (
                    <tr><td colSpan={13} className="px-4 py-12 text-center text-sm text-muted-foreground">No agents match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={currentAgentPage}
              pageCount={agentPageCount}
              pageSize={agentPageSize}
              total={filteredAgents.length}
              onPageChange={setAgentPage}
              onPageSizeChange={(size) => { setAgentPageSize(size); setAgentPage(1); }}
            />
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <div className="game-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--game-teal)]">
                  Full standings
                </p>
                <h2 className="text-sm font-bold">All teams</h2>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Team</th>
                    <th className="px-4 py-3 text-right">Active</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Sales</th>
                    <th className="px-4 py-3 text-right">Avg Deal</th>
                    <th className="px-4 py-3 text-right">Avg CPA</th>
                    <th className="px-4 py-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeams.map((t, i) => {
                    const rank = (currentTeamPage - 1) * teamPageSize + i + 1;
                    const isTop3 = rank <= 3;
                    const leaderRev = teamStats[0]?.revenue || 1;
                    const share = leaderRev > 0 ? Math.min(100, (t.revenue / leaderRev) * 100) : 0;
                    const agents = agentsPerTeam.get(t.team_id ?? "none") ?? 0;
                    const isMine = myTeamId != null && (t.team_id ?? "none") === myTeamId;
                    return (
                      <Row
                        key={(t.team_id ?? "none") + i}
                        rank={rank}
                        highlight={isMine}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                "flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-bold " +
                                (isTop3
                                  ? "bg-[var(--game-teal)]/15 text-[var(--game-teal)]"
                                  : "bg-secondary text-muted-foreground")
                              }
                            >
                              {teamInitialsLocal(t.team_name)}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span>{t.team_name}</span>
                                {isMine && (
                                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 h-1 w-28 overflow-hidden rounded-full bg-black/40">
                                <div
                                  className="h-full rounded-full bg-[var(--game-teal)]/80"
                                  style={{ width: `${share}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="num px-4 py-3 text-right text-muted-foreground">{agents}</td>
                        <td className="num px-4 py-3 text-right font-semibold text-[var(--game-orange)]">
                          {formatCurrency(t.revenue)}
                        </td>
                        <td className="num px-4 py-3 text-right">{t.count}</td>
                        <td className="num px-4 py-3 text-right">{formatCurrency(t.avgDeal)}</td>
                        <td className="num px-4 py-3 text-right">{formatCurrency(t.cpa)}</td>
                        <td className="num px-4 py-3 text-right text-muted-foreground">
                          {share.toFixed(0)}%
                        </td>
                      </Row>
                    );
                  })}
                  {!loading && teamStats.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                        No team sales yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={currentTeamPage}
              pageCount={teamPageCount}
              pageSize={teamPageSize}
              total={teamStats.length}
              onPageChange={setTeamPage}
              onPageSizeChange={(size) => { setTeamPageSize(size); setTeamPage(1); }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function teamInitialsLocal(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function PaginationControls({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows</span>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm text-muted-foreground">Page {page} of {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function Row({ rank, highlight, children }: { rank: number; highlight?: boolean; children: React.ReactNode }) {
  const medal =
    rank === 1 ? <Crown className="h-4 w-4" style={{ color: "var(--gold)" }} /> :
    rank === 2 ? <Medal className="h-4 w-4" style={{ color: "var(--silver)" }} /> :
    rank === 3 ? <Trophy className="h-4 w-4" style={{ color: "var(--bronze)" }} /> :
    null;
  return (
    <tr className={"border-t border-border/50 " + (highlight ? "bg-primary/10 ring-1 ring-inset ring-primary/30" : "hover:bg-secondary/30")}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="num w-5 font-semibold text-muted-foreground">#{rank}</span>
          {medal}
        </div>
      </td>
      {children}
    </tr>
  );
}
