import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExpenseForm } from "@/components/ExpenseForm";

export const Route = createFileRoute("/_app/expenses/new")({
  component: NewExpensePage,
});

function NewExpensePage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Log expense</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record an expense for a date range. It will be split equally across your sales in that period.
        </p>
      </div>
      <ExpenseForm onSaved={() => navigate({ to: "/expenses" })} onCancel={() => navigate({ to: "/expenses" })} />
    </div>
  );
}
