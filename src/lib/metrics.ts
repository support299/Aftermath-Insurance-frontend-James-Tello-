import { format } from "date-fns";
import type { SaleRow } from "@/lib/sales";
import type { ExpenseRow } from "@/lib/expenses";
import {
  addReportingCalendarDays,
  easternDateKey,
  easternEndFromCalendarDate,
  easternHour,
  easternStartFromCalendarDate,
  endOfDayEastern,
  getReportingTimezone,
  startOfDayEastern,
  startOfMonthEastern,
  startOfWeekEastern,
  startOfYearEastern,
  subDaysEastern,
} from "@/lib/timezone";
import { fromZonedTime } from "date-fns-tz";

export type DateRangeKey = "today" | "week" | "month" | "ytd" | "30d" | "90d" | "all" | "custom";

export function rangeFromKey(
  key: DateRangeKey,
  custom?: { from?: Date | null; to?: Date | null },
): { from: Date; to: Date } {
  const now = new Date();
  // Include all of today's sales in the reporting timezone, even if sale_date
  // is later today than the current clock (avoids missing same-day entries).
  const to = endOfDayEastern(now);
  switch (key) {
    case "today":
      return { from: startOfDayEastern(now), to };
    case "week":
      return { from: startOfWeekEastern(now), to };
    case "month":
      return { from: startOfMonthEastern(now), to };
    case "ytd":
      return { from: startOfYearEastern(now), to };
    case "30d":
      return { from: subDaysEastern(30, now), to };
    case "90d":
      return { from: subDaysEastern(90, now), to };
    case "all":
      return { from: fromZonedTime("2000-01-01T00:00:00.000", getReportingTimezone()), to };
    case "custom": {
      const from = custom?.from
        ? easternStartFromCalendarDate(custom.from)
        : subDaysEastern(7, now);
      const t = custom?.to ? easternEndFromCalendarDate(custom.to) : endOfDayEastern(now);
      return { from, to: t };
    }
  }
}

export function previousRange({ from, to }: { from: Date; to: Date }) {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}

export interface Metrics {
  totalRevenue: number;
  numSales: number;
  avgDealSize: number;
  medianDealSize: number;
  attachRate: number;
  lifeCrossSell: number;
  cpa: number;
  uniqueAgents: number;
  lifeRevenue: number;
  healthRevenue: number;
  addonRevenue: number;
  lifeAttachRatio: number;
  healthAttachRatio: number;
}

function lineItemsOf(s: SaleRow) {
  const li = (s as any).line_items;
  return Array.isArray(li) ? (li as { kind?: string; amount?: number | string }[]) : [];
}

function revenueByKind(s: SaleRow, kind: "health" | "life" | "addon"): number {
  const items = lineItemsOf(s);
  if (items.length === 0) {
    // Legacy fallback for old rows without line_items
    if (kind === "addon") return 0;
    return 0;
  }
  return items
    .filter((li) => li.kind === kind)
    .reduce((sum, li) => sum + Number(li.amount ?? 0), 0);
}

function saleHasKind(s: SaleRow, kind: "health" | "life" | "addon"): boolean {
  return lineItemsOf(s).some((li) => li.kind === kind);
}

export function computeMetrics(sales: SaleRow[]): Metrics {
  const numSales = sales.length;
  const totalRevenue = sales.reduce((s, x) => s + Number(x.deal_size), 0);
  const totalLeadCost = sales.reduce((s, x) => s + Number(x.cost_per_lead ?? 0), 0);
  const sorted = [...sales].map((s) => Number(s.deal_size)).sort((a, b) => a - b);
  const med = sorted.length === 0 ? 0 : sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const withAddon = sales.filter((s) => saleHasKind(s, "addon") || (s.add_ons?.length ?? 0) > 0).length;
  const withLife = sales.filter((s) => saleHasKind(s, "life") || s.add_ons?.includes("Life")).length;
  const withHealth = sales.filter((s) => saleHasKind(s, "health")).length;
  const agents = new Set(sales.map((s) => s.agent_id));

  const lifeRevenue = sales.reduce((sum, s) => sum + revenueByKind(s, "life"), 0);
  const healthRevenue = sales.reduce((sum, s) => sum + revenueByKind(s, "health"), 0);
  const addonRevenue = sales.reduce((sum, s) => sum + revenueByKind(s, "addon"), 0);

  return {
    totalRevenue,
    numSales,
    avgDealSize: numSales ? totalRevenue / numSales : 0,
    medianDealSize: med,
    attachRate: numSales ? (withAddon / numSales) * 100 : 0,
    lifeCrossSell: numSales ? (withLife / numSales) * 100 : 0,
    cpa: numSales ? totalLeadCost / numSales : 0,
    uniqueAgents: agents.size,
    lifeRevenue,
    healthRevenue,
    addonRevenue,
    lifeAttachRatio: numSales ? (withLife / numSales) * 100 : 0,
    healthAttachRatio: numSales ? (withHealth / numSales) * 100 : 0,
  };
}

export interface TrendPoint {
  date: string;
  revenue: number;
  count: number;
  life: number;
  health: number;
  avgDeal: number;
  totalCost: number;
}

function easternDayCount(from: Date, to: Date): number {
  const start = easternDateKey(from);
  const end = easternDateKey(to);
  let count = 0;
  let ymd = start;
  while (ymd <= end) {
    count++;
    if (ymd === end) break;
    ymd = addReportingCalendarDays(ymd, 1);
  }
  return Math.max(1, count);
}

export function buildTrend(sales: SaleRow[], from: Date, to: Date, expenses: ExpenseRow[] = []): TrendPoint[] {
  const days = easternDayCount(from, to);
  const buckets = new Map<string, { revenue: number; count: number; life: number; health: number; expense: number }>();
  const mk = () => ({ revenue: 0, count: 0, life: 0, health: 0, expense: 0 });

  const addSale = (k: string, s: SaleRow) => {
    const b = buckets.get(k);
    if (!b) return;
    b.revenue += Number(s.deal_size);
    b.count += 1;
    b.life += revenueByKind(s, "life");
    b.health += revenueByKind(s, "health");
  };

  if (days <= 1) {
    for (let h = 0; h < 24; h++) buckets.set(`${h}`, mk());
    sales.forEach((s) => addSale(`${easternHour(s.sale_date)}`, s));
    const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const perHour = totalExpense / 24;
    buckets.forEach((b) => { b.expense = perHour; });
    return [...buckets.entries()].map(([k, v]) => ({
      date: `${k.padStart(2, "0")}:00`,
      revenue: v.revenue,
      count: v.count,
      life: v.life,
      health: v.health,
      avgDeal: v.count ? v.revenue / v.count : 0,
      totalCost: v.expense,
    }));
  }

  let ymd = easternDateKey(from);
  const endYmd = easternDateKey(to);
  while (ymd <= endYmd) {
    buckets.set(ymd, mk());
    if (ymd === endYmd) break;
    ymd = addReportingCalendarDays(ymd, 1);
  }

  sales.forEach((s) => addSale(easternDateKey(s.sale_date), s));

  // Allocate each expense evenly across the days in its [start_date, end_date] range
  expenses.forEach((e) => {
    const eStart = easternDateKey(e.start_date);
    const eEnd = easternDateKey(e.end_date);
    let cursor = eStart;
    let span = 0;
    while (cursor <= eEnd) {
      span++;
      if (cursor === eEnd) break;
      cursor = addReportingCalendarDays(cursor, 1);
    }
    span = Math.max(1, span);
    const perDay = Number(e.amount) / span;
    cursor = eStart;
    while (cursor <= eEnd) {
      const b = buckets.get(cursor);
      if (b) b.expense += perDay;
      if (cursor === eEnd) break;
      cursor = addReportingCalendarDays(cursor, 1);
    }
  });

  return [...buckets.entries()].map(([k, v]) => ({
    date: format(new Date(`${k}T12:00:00`), "MMM d"),
    revenue: v.revenue,
    count: v.count,
    life: v.life,
    health: v.health,
    avgDeal: v.count ? v.revenue / v.count : 0,
    totalCost: v.expense,
  }));
}

export function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return current === 0 ? 0 : null;
  return ((current - prev) / prev) * 100;
}
