import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2, Plus, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateSaleId, formatCurrency } from "@/lib/sales";
import {
  endOfDayEastern,
  formatSaleDateTime,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "@/lib/timezone";
import { notifySalesChanged } from "@/lib/sales-events";
import { updateGhlContactFromSale } from "@/lib/ghl.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
import { ReportingOnlyField } from "@/components/ReportingOnlyField";
import { SaleLineItemRow } from "@/components/SaleLineItemRow";
import { toast } from "sonner";
import {
  clearProductFields,
  effectiveMonthlyPremium,
  lineItemMonthlyPatch,
  lineItemProductPatch,
  newSaleLineItem,
  serializeLineItem,
  type LineKind,
  type ProductWithPricing,
  type SaleLineItem,
} from "@/lib/line-items";

export const Route = createFileRoute("/_app/sales/new")({
  component: SalesEntryPage,
});

interface CarrierOpt { id: string; name: string; carrier_type: string }
interface AddOnOpt { id: string; name: string }

const lineItemSchema = z.object({
  kind: z.enum(["health", "life", "addon"]),
  carrier: z.string(),
  product: z.string().min(1, "Product required"),
  amount: z.number().min(0, "Amount must be ≥ 0"),
});

const schema = z.object({
  agent_name: z.string().trim().min(2, "Agent name required").max(80),
  team_id: z.string().uuid().optional().nullable(),
  sale_date: z.string().min(1, "Date required"),
  customer_name: z.string().trim().min(2, "Customer name required").max(120),
  line_items: z.array(lineItemSchema).min(1, "Add at least one line item"),
  lead_source: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type FormState = {
  agent_name: string;
  team_id: string;
  sale_date: string;
  customer_name: string;
  line_items: SaleLineItem[];
  lead_source: string;
  notes: string;
};

function SalesEntryPage() {
  const { profile, user, session } = useAuth();
  const navigate = useNavigate();
  const updateGhlFn = updateGhlContactFromSale;
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<CarrierOpt[]>([]);
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [addOns, setAddOns] = useState<AddOnOpt[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{ sale_id: string; date: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [reportingOnly, setReportingOnly] = useState(false);

  const [form, setForm] = useState<FormState>({
    agent_name: "",
    team_id: "",
    sale_date: toDatetimeLocalValue(),
    customer_name: "",
    line_items: [newSaleLineItem()],
    lead_source: "",
    notes: "",
  });

  useEffect(() => {
    supabase.from("teams").select("id, name").order("name").then(({ data }) => {
      if (data) setTeams(data);
    });
    supabase.from("carriers").select("id, name, carrier_type").eq("active", true).order("name").then(({ data }) => {
      if (data) setCarriers(data as CarrierOpt[]);
    });
    supabase.from("products").select("id, name, carrier_id, additional_price, additional_includes").eq("active", true).order("name").then(({ data }) => {
      if (data) setProducts(data as ProductWithPricing[]);
    });
    supabase.from("add_ons").select("id, name").eq("active", true).order("name").then(({ data }) => {
      if (data) setAddOns(data);
    });
    supabase.from("lead_sources").select("name").eq("active", true).order("name").then(({ data }) => {
      if (data) setLeadSources(data.map((r) => r.name));
    });
  }, []);

  useEffect(() => {
    if (profile && !form.agent_name) {
      setForm((f) => ({
        ...f,
        agent_name: profile.display_name,
        team_id: profile.team_id ?? f.team_id,
      }));
    }
  }, [profile]);

  const onReportingOnlyChange = (checked: boolean) => {
    setReportingOnly(checked);
    if (checked) {
      setForm((f) => ({ ...f, sale_date: f.sale_date || toDatetimeLocalValue() }));
    }
  };

  const update = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const updateLine = (id: string, patch: Partial<SaleLineItem>) => {
    setForm((f) => ({
      ...f,
      line_items: f.line_items.map((li) => (li.id === id ? { ...li, ...patch } : li)),
    }));
  };

  const onLineKindChange = (id: string, kind: LineKind) => {
    updateLine(id, { kind, ...clearProductFields() });
  };

  const onLineCarrierChange = (id: string, carrierName: string) => {
    updateLine(id, { carrier: carrierName, ...clearProductFields() });
  };

  const addLine = () =>
    setForm((f) => ({ ...f, line_items: [...f.line_items, newSaleLineItem()] }));

  const removeLine = (id: string) =>
    setForm((f) => ({
      ...f,
      line_items: f.line_items.length > 1 ? f.line_items.filter((li) => li.id !== id) : f.line_items,
    }));

  const total = useMemo(
    () => form.line_items.reduce((sum, li) => sum + (Number(li.amount) || 0), 0),
    [form.line_items],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!reportingOnly && !selectedContactId) {
      toast.error("Please select a contact from the suggestions before submitting.");
      return;
    }

    const normalizedItems = form.line_items.map(serializeLineItem);
    for (const li of form.line_items) {
      if (!li.kind) {
        toast.error("Select a type for each line item");
        return;
      }
      if (li.kind !== "addon" && !li.carrier) {
        toast.error("Each insurance line item needs a carrier");
        return;
      }
      if (!li.product) {
        toast.error("Each line item needs a product");
        return;
      }
      if (li.amount === "" || li.amount === undefined) {
        toast.error("Each line item needs an amount");
        return;
      }
      const n = Number(li.amount);
      if (!isFinite(n) || n < 0) {
        toast.error(`Invalid amount on line item`);
        return;
      }
    }

    const parsed = schema.safeParse({
      agent_name: form.agent_name,
      team_id: form.team_id || null,
      sale_date: reportingOnly ? form.sale_date : toDatetimeLocalValue(),
      customer_name: form.customer_name,
      line_items: normalizedItems,
      lead_source: form.lead_source || undefined,
      notes: form.notes || undefined,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const e: Record<string, string | undefined> = {};
      Object.entries(flat).forEach(([k, v]) => (e[k] = v?.[0]));
      setErrors(e);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);

    const saleInstant = reportingOnly
      ? fromDatetimeLocalValue(parsed.data.sale_date)
      : new Date();
    if (reportingOnly && saleInstant.getTime() > endOfDayEastern().getTime()) {
      setSubmitting(false);
      toast.error("Sale date cannot be after today in the reporting timezone.");
      return;
    }

    const sale_id = generateSaleId(saleInstant);
    const team = teams.find((t) => t.id === parsed.data.team_id);
    const dealSize = parsed.data.line_items.reduce((s, li) => s + li.amount, 0);
    const first = parsed.data.line_items[0];

    const { error } = await supabase.from("sales").insert({
      sale_id,
      agent_id: user.id,
      agent_name: parsed.data.agent_name,
      team_id: parsed.data.team_id ?? null,
      team_name: team?.name ?? null,
      sale_date: saleInstant.toISOString(),
      customer_name: parsed.data.customer_name,
      ghl_contact_id: reportingOnly ? null : selectedContactId,
      deal_size: dealSize,
      carrier: first.carrier || (first.kind === "addon" ? "Add-on" : ""),
      product: first.product,
      add_ons: [],
      add_on_amounts: {},
      line_items: parsed.data.line_items,
      lead_source: parsed.data.lead_source ?? null,
      notes: parsed.data.notes ?? null,
      reporting_only: reportingOnly,
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    // Update GHL contact custom fields based on the sale (skip when reporting only).
    if (!reportingOnly) {
      try {
        const accessToken = session?.access_token;
        if (accessToken && selectedContactId) {
          await updateGhlFn({
            data: {
              accessToken,
              contactId: selectedContactId,
              lineItems: form.line_items
                .filter((li) => li.kind)
                .map((li) => {
                  const monthly =
                    li.monthly_premium !== "" && isFinite(Number(li.monthly_premium))
                      ? effectiveMonthlyPremium(li)
                      : li.amount !== "" && isFinite(Number(li.amount))
                        ? +(Number(li.amount) / 12).toFixed(2)
                        : undefined;
                  return {
                    kind: li.kind as LineKind,
                    carrier: li.carrier,
                    product: li.product,
                    amount: Number(li.amount),
                    ...(li.kind === "health" || li.kind === "life"
                      ? { monthlyPremium: monthly }
                      : {}),
                  };
                }),
            },
          });
        }
      } catch (err) {
        console.error("[GHL update]", err);
        toast.warning("Sale saved, but failed to update GHL contact fields.");
      }
    }

    setSubmitting(false);
    setSelectedContactId(null);
    setReportingOnly(false);
    notifySalesChanged();
    setConfirmation({ sale_id, date: formatSaleDateTime(saleInstant) });
  };

  const resetForm = () => {
    setConfirmation(null);
    setForm({
      ...form,
      customer_name: "",
      line_items: [newSaleLineItem()],
      lead_source: "",
      notes: "",
      sale_date: toDatetimeLocalValue(),
    });
    setReportingOnly(false);
  };

  if (confirmation) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="surface-card p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 ring-1 ring-success/30">
            <CheckCircle2 className="h-7 w-7 text-success" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Sale recorded!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your sale is now live in the dashboard.</p>
          <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4 text-left">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Sale ID</div>
            <div className="num mt-1 text-lg font-semibold">{confirmation.sale_id}</div>
            <div className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">Submitted</div>
            <div className="num mt-1 text-sm">{confirmation.date}</div>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Submit another
            </Button>
            <Button variant="secondary" onClick={() => navigate({ to: "/dashboard" })}>
              View dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New sale</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log a closed policy. A unique Sale ID is generated automatically.</p>
      </div>

      <form onSubmit={onSubmit} className="surface-card space-y-8 p-6 sm:p-8">
        <Section title="Sale details">
          <Field label="Agent name" error={errors.agent_name}>
            <Input value={form.agent_name} readOnly disabled />
          </Field>
          <Field label="Team / Manager">
            <Input
              value={
                form.team_id
                  ? teams.find((t) => t.id === form.team_id)?.name ?? "Loading…"
                  : "— No team assigned —"
              }
              readOnly
              disabled
            />
          </Field>
          <Field label="Customer name" error={errors.customer_name}>
            <CustomerAutocomplete
              value={form.customer_name}
              onChange={(v) => {
                update("customer_name", v);
                setSelectedContactId(null);
              }}
              onSelect={(c) => setSelectedContactId(c.id)}
              placeholder="Search a contact…"
            />
          </Field>
          <ReportingOnlyField checked={reportingOnly} onCheckedChange={onReportingOnlyChange} />
          {reportingOnly && (
            <Field label="Date of sale" error={errors.sale_date}>
              <Input
                type="datetime-local"
                value={form.sale_date}
                onChange={(e) => update("sale_date", e.target.value)}
              />
            </Field>
          )}
        </Section>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line items</h2>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add line item
            </Button>
          </div>
          <div className="space-y-3">
            {form.line_items.map((li, idx) => (
              <SaleLineItemRow
                key={li.id}
                index={idx}
                item={li}
                carriers={carriers}
                products={products}
                addOns={addOns}
                canRemove={form.line_items.length > 1}
                onKindChange={(v) => onLineKindChange(li.id, v)}
                onCarrierChange={(v) => onLineCarrierChange(li.id, v)}
                onProductChange={(v) =>
                  updateLine(li.id, lineItemProductPatch(v, li, products, carriers))
                }
                onMonthlyPremiumChange={(v) =>
                  updateLine(li.id, lineItemMonthlyPatch(v, li))
                }
                onRemove={() => removeLine(li.id)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="num text-base font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <Section title="Lead info (optional)">
          <Field label="Lead source">
            <Select value={form.lead_source || undefined} onValueChange={(v) => update("lead_source", v)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {leadSources.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label htmlFor="notes" className="mb-1.5 block">Notes</Label>
            <Textarea id="notes" maxLength={500} rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Anything noteworthy about this deal…" />
            <div className="mt-1 text-right text-xs text-muted-foreground">{form.notes.length}/500</div>
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
          <Link to="/dashboard" className="inline-flex items-center justify-center rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70">Cancel</Link>
          <Button type="submit" disabled={submitting} className="min-w-[160px]">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</> : "Submit sale"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
