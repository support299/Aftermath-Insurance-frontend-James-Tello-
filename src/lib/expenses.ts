import { supabase } from "@/integrations/supabase/client";
import type { SaleRow } from "@/lib/sales";

export interface ExpenseRow {
  id: string;
  agent_id: string;
  amount: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch expenses overlapping [from, to]. Optionally restrict to a single agent.
 */
export async function fetchExpensesInRange(
  from: Date,
  to: Date,
  opts?: { agentId?: string },
): Promise<ExpenseRow[]> {
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  let q = supabase
    .from("expenses")
    .select("*")
    .lte("start_date", toStr)
    .gte("end_date", fromStr)
    .order("start_date", { ascending: false });
  if (opts?.agentId) q = q.eq("agent_id", opts.agentId);
  const { data } = await q;
  return (data ?? []) as ExpenseRow[];
}

/**
 * Total cost = sum of expense amounts in the range.
 * Average CPA = total cost / number of sales in range. (Equal split per sale.)
 */
export function computeCpa(
  expenses: ExpenseRow[],
  sales: SaleRow[],
): { totalCost: number; avgCpa: number; numSales: number } {
  const totalCost = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const numSales = sales.length;
  return {
    totalCost,
    avgCpa: numSales > 0 ? totalCost / numSales : 0,
    numSales,
  };
}
