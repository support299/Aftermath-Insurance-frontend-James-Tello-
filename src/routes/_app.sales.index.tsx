import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, PlusCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { type SaleRow, formatCurrency } from "@/lib/sales";
import { formatSaleDateTime } from "@/lib/timezone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useRefreshTick } from "@/hooks/use-auto-refresh";
import { LIVE_REFRESH_MS } from "@/lib/sales-events";
import { useOnSalesChanged } from "@/hooks/use-on-sales-changed";

export const Route = createFileRoute("/_app/sales/")({
  component: SalesListPage,
});

function SalesListPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistentState<string>("sales.search", "");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const refreshTick = useRefreshTick(LIVE_REFRESH_MS);
  const [salesVersion, setSalesVersion] = useState(0);
  useOnSalesChanged(() => setSalesVersion((v) => v + 1));

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    let q = supabase.from("sales").select("*").order("sale_date", { ascending: false }).limit(500);
    if (!isAdmin && !isManager) q = q.eq("agent_id", user.id);
    else if (isManager && !isAdmin && profile?.team_id) q = q.eq("team_id", profile.team_id);
    q.then(({ data }) => {
      if (!active) return;
      setSales((data ?? []) as SaleRow[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id, isAdmin, isManager, profile?.team_id, refreshTick, salesVersion]);

  const canEdit = (s: SaleRow) =>
    isAdmin ||
    (isManager && s.team_id && profile?.team_id && s.team_id === profile.team_id) ||
    s.agent_id === user?.id;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) =>
      s.sale_id.toLowerCase().includes(q) ||
      s.agent_name.toLowerCase().includes(q) ||
      (s.customer_name?.toLowerCase().includes(q) ?? false) ||
      s.carrier.toLowerCase().includes(q),
    );
  }, [sales, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sales</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin ? "All sales records." : isManager ? "Sales for your team." : "Your sales records."}
          </p>
        </div>
        <Button asChild>
          <Link to="/sales/new"><PlusCircle className="mr-2 h-4 w-4" /> New sale</Link>
        </Button>
      </div>

      <div className="surface-card p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by sale ID, agent, customer, carrier…"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-semibold">{filtered.length} record{filtered.length === 1 ? "" : "s"}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Sale ID</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Deal</th>
                <th className="px-4 py-3 text-left">Carrier</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((s) => {
                const editable = canEdit(s);
                return (
                  <tr key={s.id} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="num px-4 py-3 text-xs">{s.sale_id}</td>
                    <td className="px-4 py-3">{s.agent_name}</td>
                    <td className="px-4 py-3">{s.customer_name ?? "—"}</td>
                    <td className="num px-4 py-3 text-xs text-muted-foreground">{formatSaleDateTime(s.sale_date)}</td>
                    <td className="num px-4 py-3 text-right font-medium">{formatCurrency(Number(s.deal_size))}</td>
                    <td className="px-4 py-3">{s.carrier}</td>
                    <td className="px-4 py-3 text-right">
                      {editable ? (
                        <Button asChild size="sm" variant="secondary">
                          <Link to="/sales/$saleId/edit" params={{ saleId: s.id }}>
                            <Pencil className="mr-1 h-3 w-3" /> Edit
                          </Link>
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">View only</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No sales records found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border p-3 text-sm">
            <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
