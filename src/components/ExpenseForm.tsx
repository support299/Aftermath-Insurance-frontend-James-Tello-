import { useState } from "react";
import { parseISO } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ExpenseRow } from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateField } from "@/components/DateField";

interface Props {
  existing?: ExpenseRow;
  onSaved: () => void;
  onCancel: () => void;
}


//this is the form that allows the user to log an expense

export function ExpenseForm({ existing, onSaved, onCancel }: Props) {
  const { user } = useAuth();
  const [from, setFrom] = useState<Date | undefined>(existing ? parseISO(existing.start_date) : undefined);
  const [to, setTo] = useState<Date | undefined>(existing ? parseISO(existing.end_date) : undefined);
  const [amount, setAmount] = useState<string>(existing ? String(existing.amount) : "");
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!user) { toast.error("Not signed in"); return; }
    if (!from || !to) { toast.error("Pick a date range"); return; }
    if (to < from) { toast.error("End date must be after start date"); return; }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    const payload = {
      amount: amt,
      start_date: from.toISOString().slice(0, 10),
      end_date: to.toISOString().slice(0, 10),
      notes: notes.trim() || null,
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("expenses").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("expenses").insert({ ...payload, agent_id: user.id }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Expense updated" : "Expense logged");
    onSaved();
  };

  return (
    <div className="surface-card space-y-5 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <DateField label="From" value={from} onChange={setFrom} max={to} />
        <DateField label="To" value={to} onChange={setTo} min={from} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Amount</label>
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Notes</label>
        <Textarea
          rows={3}
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : existing ? "Save changes" : "Log expense"}</Button>
      </div>
    </div>
  );
}
