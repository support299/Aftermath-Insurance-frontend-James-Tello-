import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ArrowLeft, DollarSign, Heart, LineChart as LineChartIcon, Package, Percent, ShieldPlus, TrendingUp, Wallet, Users } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/lib/company-settings";
import { type SaleRow, formatCurrency, formatPct } from "@/lib/sales";
import { buildTrend, computeMetrics, pctChange, previousRange, rangeFromKey, type DateRangeKey } from "@/lib/metrics";
import { computeCpa, fetchExpensesInRange, type ExpenseRow } from "@/lib/expenses";
import { LIVE_REFRESH_MS } from "@/lib/sales-events";
import { useOnSalesChanged } from "@/hooks/use-on-sales-changed";
import { useRefreshTick } from "@/hooks/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DateField } from "@/components/DateField";

export const Route = createFileRoute("/_app/agents/$agentId")({
  component: AgentDashboardPage,
});

const RANGE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range…" },
];

type TargetSet = {
  life_revenue_target: number;
  health_revenue_target: number;
  addon_revenue_target: number;
  life_attach_ratio_target: number;
  health_attach_ratio_target: number;
  addon_attach_ratio_target: number;
};

function AgentDashboardPage() {
  const { agentId } = Route.useParams();
  const { reportingTimezone } = useCompanySettings();
  const [rangeKey, setRangeKey] = useState<DateRangeKey>("month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [carrier, setCarrier] = useState<string>("all");
  const [product, setProduct] = useState<string>("all");
  const [leadSource, setLeadSource] = useState<string>("all");
  const [addon, setAddon] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [prevSales, setPrevSales] = useState<SaleRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [prevExpenses, setPrevExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<TargetSet | null>(null);
  const [trendMetric, setTrendMetric] = useState<"revenue" | "avgDeal" | "life" | "health" | "totalCost" | "all">("revenue");

  const range = useMemo(
    () => rangeFromKey(rangeKey, { from: customFrom, to: customTo }),
    [rangeKey, customFrom, customTo, reportingTimezone],
  );
  const prevRange = useMemo(() => previousRange(range), [range]);
  const refreshTick = useRefreshTick(LIVE_REFRESH_MS);
  const [salesVersion, setSalesVersion] = useState(0);
  useOnSalesChanged(() => setSalesVersion((v) => v + 1));

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from("sales").select("*").eq("agent_id", agentId)
        .gte("sale_date", range.from.toISOString()).lte("sale_date", range.to.toISOString())
        .order("sale_date", { ascending: false }),
      supabase.from("sales").select("*").eq("agent_id", agentId)
        .gte("sale_date", prevRange.from.toISOString()).lt("sale_date", prevRange.to.toISOString()),
      fetchExpensesInRange(range.from, range.to, { agentId }),
      fetchExpensesInRange(prevRange.from, prevRange.to, { agentId }),
    ]).then(([cur, prev, exp, prevExp]) => {
      if (!active) return;
      setSales((cur.data ?? []) as SaleRow[]);
      setPrevSales((prev.data ?? []) as SaleRow[]);
      setExpenses(exp);
      setPrevExpenses(prevExp);
      setLoading(false);
    });
    return () => { active = false; };
  }, [agentId, range.from.getTime(), range.to.getTime(), reportingTimezone, refreshTick, salesVersion]);

  // Targets: agent-specific, fallback to company
  useEffect(() => {
    let active = true;
    const cols = "life_revenue_target, health_revenue_target, addon_revenue_target, life_attach_ratio_target, health_attach_ratio_target, addon_attach_ratio_target";
    const run = async () => {
      const agentRes = await supabase.from("targets").select(cols)
        .eq("scope", "agent").eq("agent_id", agentId).maybeSingle();
      if (active && agentRes.data) { setTargets(agentRes.data as any); return; }
      const compRes = await supabase.from("targets").select(cols).eq("scope", "company").maybeSingle();
      if (active) setTargets((compRes.data as any) ?? null);
    };
    run();
    return () => { active = false; };
  }, [agentId]);

  const agentInfo = useMemo(() => {
    const s = sales[0] ?? prevSales[0];
    return { name: s?.agent_name ?? "Agent", team: s?.team_name ?? "Unassigned" };
  }, [sales, prevSales]);

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (carrier !== "all" && s.carrier !== carrier) return false;
      if (product !== "all" && s.product !== product) return false;
      if (leadSource !== "all" && (s.lead_source ?? "") !== leadSource) return false;
      if (addon !== "all") {
        if (addon === "__none") {
          if ((s.add_ons?.length ?? 0) > 0) return false;
        } else if (!s.add_ons?.includes(addon)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!s.sale_id.toLowerCase().includes(q) && !(s.customer_name?.toLowerCase().includes(q) ?? false)) return false;
      }
      return true;
    });
  }, [sales, carrier, product, leadSource, addon, search]);

  const m = useMemo(() => computeMetrics(filtered), [filtered]);
  const mPrev = useMemo(() => computeMetrics(prevSales), [prevSales]);
  const cpa = useMemo(() => computeCpa(expenses, filtered), [expenses, filtered]);
  const cpaPrev = useMemo(() => computeCpa(prevExpenses, prevSales), [prevExpenses, prevSales]);
  const trend = useMemo(() => buildTrend(filtered, range.from, range.to, expenses), [filtered, range.from.getTime(), range.to.getTime(), expenses]);

  const carriers = useMemo(() => Array.from(new Set(sales.map((s) => s.carrier))).sort(), [sales]);
  const products = useMemo(() => Array.from(new Set(sales.map((s) => s.product))).sort(), [sales]);
  const leadSources = useMemo(
    () => Array.from(new Set(sales.map((s) => s.lead_source).filter((x): x is string => !!x))).sort(),
    [sales],
  );
  const addons = useMemo(() => {
    const set = new Set<string>();
    sales.forEach((s) => s.add_ons?.forEach((a) => set.add(a)));
    return [...set].sort();
  }, [sales]);

  const topByKind = useMemo(() => {
    const make = () => new Map<string, { count: number; revenue: number }>();
    const maps = { life: make(), health: make(), addon: make() };
    const bump = (kind: "life" | "health" | "addon", name: string, amount: number) => {
      const mm = maps[kind];
      const cur = mm.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += amount;
      mm.set(name, cur);
    };
    filtered.forEach((s) => {
      const items = (s as any).line_items as { product?: string; amount?: number | string; kind?: string }[] | undefined;
      if (Array.isArray(items) && items.length > 0) {
        items.forEach((li) => {
          const k = li.kind as "life" | "health" | "addon" | undefined;
          if (k !== "life" && k !== "health" && k !== "addon") return;
          bump(k, li.product || "Unknown", Number(li.amount ?? 0));
        });
      }
      if (Array.isArray(s.add_ons)) {
        const amounts = ((s as any).add_on_amounts ?? {}) as Record<string, number | string>;
        s.add_ons.forEach((a) => {
          const hasInLineItems = Array.isArray(items) && items.some((li) => li.kind === "addon" && li.product === a);
          if (hasInLineItems) return;
          bump("addon", a, Number(amounts?.[a] ?? 0));
        });
      }
    });
    const top = (mm: Map<string, { count: number; revenue: number }>) =>
      [...mm.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count).slice(0, 10);
    return { life: top(maps.life), health: top(maps.health), addon: top(maps.addon) };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link to="/agents"><ArrowLeft className="mr-1 h-4 w-4" /> All agents</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{agentInfo.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Team: {agentInfo.team}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Date range</label>
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as DateRangeKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {rangeKey === "custom" && (
          <>
            <DateField label="From" value={customFrom} onChange={setCustomFrom} max={customTo} />
            <DateField label="To" value={customTo} onChange={setCustomTo} min={customFrom} />
          </>
        )}
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Carrier</label>
          <Select value={carrier} onValueChange={setCarrier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All carriers</SelectItem>
              {carriers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Product</label>
          <Select value={product} onValueChange={setProduct}>
            <SelectTrigger><SelectValue placeholder="All products" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Add-on</label>
          <Select value={addon} onValueChange={setAddon}>
            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any add-on</SelectItem>
              <SelectItem value="__none">No add-ons</SelectItem>
              {addons.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Lead source</label>
          <Select value={leadSource} onValueChange={setLeadSource}>
            <SelectTrigger><SelectValue placeholder="All sources" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {leadSources.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Search</label>
          <Input placeholder="Sale ID or customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Total Revenue" icon={DollarSign} value={formatCurrency(m.totalRevenue)}
          delta={pctChange(m.totalRevenue, mPrev.totalRevenue)} sub="vs previous period"
          corner={<span>{m.numSales.toLocaleString()} sale{m.numSales === 1 ? "" : "s"}</span>} />
        <MetricCard title="Average Deal Size" icon={Wallet} value={formatCurrency(m.avgDealSize)}
          delta={pctChange(m.avgDealSize, mPrev.avgDealSize)}
          sub={`Median: ${formatCurrency(m.medianDealSize)}`} />
        <MetricCard title="Add-on Attach Rate" icon={Percent} value={formatPct(m.attachRate)}
          delta={pctChange(m.attachRate, mPrev.attachRate)}
          sub={targets ? `Target: ${formatPct(Number(targets.addon_attach_ratio_target))}` : "Across all sales"}
          targetValue={targets ? Number(targets.addon_attach_ratio_target) : null}
          currentValue={m.attachRate} />
        <MetricCard title="Life Insurance Revenue" icon={ShieldPlus} value={formatCurrency(m.lifeRevenue)}
          delta={pctChange(m.lifeRevenue, mPrev.lifeRevenue)}
          sub={targets ? `Target: ${formatCurrency(Number(targets.life_revenue_target))}` : "No target set"}
          targetValue={targets ? Number(targets.life_revenue_target) : null}
          currentValue={m.lifeRevenue} />
        <MetricCard title="Life Attach Ratio" icon={TrendingUp} value={formatPct(m.lifeAttachRatio)}
          delta={pctChange(m.lifeAttachRatio, mPrev.lifeAttachRatio)}
          sub={targets ? `Target: ${formatPct(Number(targets.life_attach_ratio_target))}` : "No target set"}
          targetValue={targets ? Number(targets.life_attach_ratio_target) : null}
          currentValue={m.lifeAttachRatio} />
        <MetricCard title="Health Insurance Revenue" icon={Heart} value={formatCurrency(m.healthRevenue)}
          delta={pctChange(m.healthRevenue, mPrev.healthRevenue)}
          sub={targets ? `Target: ${formatCurrency(Number(targets.health_revenue_target))}` : "No target set"}
          targetValue={targets ? Number(targets.health_revenue_target) : null}
          currentValue={m.healthRevenue} />
        <MetricCard title="Health Attach Ratio" icon={Percent} value={formatPct(m.healthAttachRatio)}
          delta={pctChange(m.healthAttachRatio, mPrev.healthAttachRatio)}
          sub={targets ? `Target: ${formatPct(Number(targets.health_attach_ratio_target))}` : "No target set"}
          targetValue={targets ? Number(targets.health_attach_ratio_target) : null}
          currentValue={m.healthAttachRatio} />
        <MetricCard title="Add-on Revenue" icon={Package} value={formatCurrency(m.addonRevenue)}
          delta={pctChange(m.addonRevenue, mPrev.addonRevenue)}
          sub={targets ? `Target: ${formatCurrency(Number(targets.addon_revenue_target))}` : "No target set"}
          targetValue={targets ? Number(targets.addon_revenue_target) : null}
          currentValue={m.addonRevenue} />
        <MetricCard title="Cost per Acquisition" icon={Users} value={formatCurrency(cpa.avgCpa)}
          delta={pctChange(cpa.avgCpa, cpaPrev.avgCpa)} invertDelta
          sub={`Total cost: ${formatCurrency(cpa.totalCost)}`}
          corner={<span>{cpa.numSales.toLocaleString()} sale{cpa.numSales === 1 ? "" : "s"}</span>} />
      </div>

      {/* Trend chart */}
      <div className="surface-card p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">
              {trendMetric === "revenue" && "Total revenue trend"}
              {trendMetric === "avgDeal" && "Average deal size trend"}
              {trendMetric === "life" && "Life insurance revenue trend"}
              {trendMetric === "health" && "Health insurance revenue trend"}
              {trendMetric === "totalCost" && "Total Cost trend"}
              {trendMetric === "all" && "Combined trends"}
            </h2>
            <p className="text-xs text-muted-foreground">{format(range.from, "MMM d, yyyy")} → {format(range.to, "MMM d, yyyy")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={trendMetric} onValueChange={(v) => setTrendMetric(v as typeof trendMetric)}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Total revenue</SelectItem>
                <SelectItem value="avgDeal">Average deal size</SelectItem>
                <SelectItem value="life">Life insurance revenue</SelectItem>
                <SelectItem value="health">Health insurance revenue</SelectItem>
                <SelectItem value="totalCost">Total Cost</SelectItem>
                <SelectItem value="all">All metrics</SelectItem>
              </SelectContent>
            </Select>
            <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="h-72 w-full">
          {loading ? (
            <div className="h-full w-full animate-pulse rounded-md bg-muted/40" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.30 0.025 260)" vertical={false} />
                <XAxis dataKey="date" stroke="oklch(0.68 0.03 255)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.03 255)" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.20 0.025 260)", border: "1px solid oklch(0.30 0.025 260)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "oklch(0.97 0.01 250)" }}
                  formatter={(v: any, name: any) => [formatCurrency(Number(v)), String(name)]}
                />
                {(trendMetric === "revenue" || trendMetric === "all") && (
                  <Line type="monotone" dataKey="revenue" name="Total revenue" stroke="oklch(0.72 0.18 250)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
                {(trendMetric === "avgDeal" || trendMetric === "all") && (
                  <Line type="monotone" dataKey="avgDeal" name="Avg deal size" stroke="oklch(0.78 0.14 195)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
                {(trendMetric === "life" || trendMetric === "all") && (
                  <Line type="monotone" dataKey="life" name="Life revenue" stroke="oklch(0.75 0.18 30)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
                {(trendMetric === "health" || trendMetric === "all") && (
                  <Line type="monotone" dataKey="health" name="Health revenue" stroke="oklch(0.75 0.18 145)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
                {(trendMetric === "totalCost" || trendMetric === "all") && (
                  <Line type="monotone" dataKey="totalCost" name="Total Cost" stroke="oklch(0.78 0.16 80)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Most sold products by category */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TopProductsCard title="Most sold life insurance" items={topByKind.life} loading={loading} unitLabel="Policies" />
        <TopProductsCard title="Most sold health insurance" items={topByKind.health} loading={loading} unitLabel="Policies" />
        <TopProductsCard title="Most sold add-ons" items={topByKind.addon} loading={loading} unitLabel="Units" />
      </div>
    </div>
  );
}

function MetricCard({
  title, icon: Icon, value, delta, sub, invertDelta, corner, targetValue, currentValue,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  delta: number | null;
  sub: string;
  invertDelta?: boolean;
  corner?: React.ReactNode;
  targetValue?: number | null;
  currentValue?: number | null;
}) {
  const showDelta = delta !== null;
  const positive = (delta ?? 0) >= 0;
  const good = invertDelta ? !positive : positive;
  const hasTarget = typeof targetValue === "number" && targetValue > 0 && typeof currentValue === "number";
  const targetMet = hasTarget && (currentValue as number) >= (targetValue as number);
  const subClass = hasTarget ? (targetMet ? "text-success font-medium" : "text-destructive font-medium") : "text-muted-foreground";
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="num text-3xl font-bold tracking-tight">{value}</div>
        {corner && <div className="text-xs text-muted-foreground">{corner}</div>}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {showDelta && (
          <span className={"flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium " + (good ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
            {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta!).toFixed(1)}%
          </span>
        )}
        <span className={subClass}>{sub}</span>
      </div>
    </div>
  );
}

function TopProductsCard({
  title, items, loading, unitLabel,
}: {
  title: string;
  items: { name: string; count: number; revenue: number }[];
  loading: boolean;
  unitLabel: string;
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="text-xs text-muted-foreground">Top {items.length}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">{unitLabel}</th>
              <th className="px-4 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p, i) => (
              <tr key={p.name} className="border-t border-border/50 hover:bg-secondary/30">
                <td className="num px-4 py-3 text-xs text-muted-foreground">#{i + 1}</td>
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="num px-4 py-3 text-right">{p.count}</td>
                <td className="num px-4 py-3 text-right font-medium">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">No data in this range.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
