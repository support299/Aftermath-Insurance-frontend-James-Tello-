import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExpenseForm } from "@/components/ExpenseForm";
import type { ExpenseRow } from "@/lib/expenses";

export const Route = createFileRoute("/_app/expenses/$expenseId/edit")({
  component: EditExpensePage,
});

function EditExpensePage() {
  const { expenseId } = Route.useParams();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<ExpenseRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.from("expenses").select("*").eq("id", expenseId).maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setExpense(data as ExpenseRow | null);
        setLoading(false);
      });
    return () => { active = false; };
  }, [expenseId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!expense) return <div className="text-sm text-muted-foreground">Expense not found.</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit expense</h1>
      </div>
      <ExpenseForm
        existing={expense}
        onSaved={() => navigate({ to: "/expenses" })}
        onCancel={() => navigate({ to: "/expenses" })}
      />
    </div>
  );
}
