import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Pencil, PlusCircle, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { type ExpenseRow } from "@/lib/expenses";
import { formatCurrency } from "@/lib/sales";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/expenses/")({
  component: ExpensesListPage,
});

type Row = ExpenseRow & { agent_name?: string | null };

function ExpensesListPage() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const canManageOthers = isAdmin || isManager;
  const [rows, setRows] = useState<Row[]>([]);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("start_date", { ascending: false })
      .limit(500);
    const list = (data ?? []) as ExpenseRow[];
    setRows(list);
    const agentIds = Array.from(new Set(list.map((e) => e.agent_id)));
    if (agentIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", agentIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.display_name; });
      setAgentNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const canEdit = (e: ExpenseRow) => isAdmin || isManager || e.agent_id === user?.id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) =>
      (agentNames[e.agent_id] ?? "").toLowerCase().includes(q) ||
      (e.notes ?? "").toLowerCase().includes(q),
    );
  }, [rows, search, agentNames]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Expense deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {canManageOthers ? "All expenses across the team." : "Your logged expenses."}
          </p>
        </div>
        <Button asChild>
          <Link to="/expenses/new"><PlusCircle className="mr-2 h-4 w-4" /> New expense</Link>
        </Button>
      </div>

      <div className="surface-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by agent or notes…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">{filtered.length} record{filtered.length === 1 ? "" : "s"}</h2>
          <div className="text-sm text-muted-foreground">Total: <span className="num font-medium text-foreground">{formatCurrency(total)}</span></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Range</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const editable = canEdit(e);
                return (
                  <tr key={e.id} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-3">{agentNames[e.agent_id] ?? "—"}</td>
                    <td className="num px-4 py-3 text-xs text-muted-foreground">
                      {format(parseISO(e.start_date), "MMM d, yyyy")} → {format(parseISO(e.end_date), "MMM d, yyyy")}
                    </td>
                    <td className="num px-4 py-3 text-right font-medium">{formatCurrency(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.notes ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {editable ? (
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="secondary">
                            <Link to="/expenses/$expenseId/edit" params={{ expenseId: e.id }}>
                              <Pencil className="mr-1 h-3 w-3" /> Edit
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => remove(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">View only</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No expenses yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
