import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { type SaleRow, formatCurrency } from "@/lib/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/sales/$saleId/edit")({
  component: SalesEditPage,
});

type LineKind = "health" | "life" | "addon";

interface CarrierOpt { id: string; name: string; carrier_type: string }
interface ProductOpt { id: string; name: string; carrier_id: string | null }
interface AddOnOpt { id: string; name: string }

interface LineItem {
  id: string;
  kind: LineKind | "";
  carrier: string;
  product: string;
  amount: string;
}

function newLineItem(): LineItem {
  return { id: crypto.randomUUID(), kind: "", carrier: "", product: "", amount: "" };
}

function SalesEditPage() {
  const { saleId } = Route.useParams();
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const isManager = roles.includes("manager");

  const [sale, setSale] = useState<SaleRow | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<CarrierOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [addOns, setAddOns] = useState<AddOnOpt[]>([]);
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [saleDate, setSaleDate] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()]);
  const [leadSource, setLeadSource] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from("sales").select("*").eq("id", saleId).maybeSingle(),
      supabase.from("teams").select("id, name").order("name"),
      supabase.from("carriers").select("id, name, carrier_type").eq("active", true).order("name"),
      supabase.from("products").select("id, name, carrier_id").eq("active", true).order("name"),
      supabase.from("add_ons").select("id, name").eq("active", true).order("name"),
      supabase.from("lead_sources").select("name").eq("active", true).order("name"),
    ]).then(([sRes, tRes, cRes, pRes, aRes, lRes]) => {
      if (!active) return;
      if (!sRes.data) { setNotFound(true); setLoading(false); return; }
      const s = sRes.data as any;
      setSale(s);
      setCustomerName(s.customer_name ?? "");
      setSaleDate(new Date(s.sale_date).toISOString().slice(0, 16));
      setTeamId(s.team_id ?? "");
      const carriersData = (cRes.data ?? []) as CarrierOpt[];
      const addOnsData = (aRes.data ?? []) as AddOnOpt[];
      const inferKind = (carrierName: string, productName: string): LineKind | "" => {
        if (addOnsData.some((a) => a.name === productName)) return "addon";
        const c = carriersData.find((cc) => cc.name === carrierName);
        if (c?.carrier_type === "life") return "life";
        if (c?.carrier_type === "health") return "health";
        return "";
      };
      const rawItems = Array.isArray(s.line_items) ? s.line_items : [];
      if (rawItems.length > 0) {
        setLineItems(
          rawItems.map((it: any) => {
            const carrier = String(it.carrier ?? "");
            const product = String(it.product ?? "");
            const kind = (it.kind as LineKind | undefined) || inferKind(carrier, product);
            return {
              id: crypto.randomUUID(),
              kind,
              carrier: kind === "addon" ? "" : carrier,
              product,
              amount: it.amount != null ? String(it.amount) : "",
            };
          }),
        );
      } else if (s.carrier || s.product) {
        const kind = inferKind(s.carrier ?? "", s.product ?? "");
        setLineItems([
          {
            id: crypto.randomUUID(),
            kind,
            carrier: kind === "addon" ? "" : (s.carrier ?? ""),
            product: s.product ?? "",
            amount: s.deal_size != null ? String(s.deal_size) : "",
          },
        ]);
      } else {
        setLineItems([newLineItem()]);
      }
      setLeadSource(s.lead_source ?? "");
      setNotes(s.notes ?? "");
      setTeams(tRes.data ?? []);
      setCarriers(carriersData);
      setProducts(pRes.data ?? []);
      setAddOns(addOnsData);
      setLeadSources((lRes.data ?? []).map((r: any) => r.name));
      setLoading(false);
    });
    return () => { active = false; };
  }, [saleId]);

  const canEdit = useMemo(() => {
    if (!sale || !user) return false;
    if (isAdmin) return true;
    if (isManager && sale.team_id && profile?.team_id && sale.team_id === profile.team_id) return true;
    return sale.agent_id === user.id;
  }, [sale, user, profile, isAdmin, isManager]);

  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, ...patch } : li)));

  const addLine = () => setLineItems((p) => [...p, newLineItem()]);
  const removeLine = (id: string) =>
    setLineItems((p) => (p.length > 1 ? p.filter((li) => li.id !== id) : p));

  const total = useMemo(
    () => lineItems.reduce((s, li) => s + (Number(li.amount) || 0), 0),
    [lineItems],
  );

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || !canEdit) return;
    if (!customerName.trim()) { toast.error("Customer name required"); return; }
    if (lineItems.length === 0) { toast.error("Add at least one line item"); return; }

    const normalized: { kind: LineKind; carrier: string; product: string; amount: number }[] = [];
    for (const li of lineItems) {
      if (!li.kind) { toast.error("Select a type for each line item"); return; }
      if (li.kind !== "addon" && !li.carrier) { toast.error("Each insurance line item needs a carrier"); return; }
      if (!li.product) { toast.error("Each line item needs a product"); return; }
      if (li.amount === "") { toast.error("Each line item needs an amount"); return; }
      const n = Number(li.amount);
      if (!isFinite(n) || n < 0) { toast.error("Invalid amount on a line item"); return; }
      normalized.push({ kind: li.kind, carrier: li.carrier, product: li.product, amount: n });
    }

    setSaving(true);
    const team = teams.find((t) => t.id === teamId);
    const dealSize = normalized.reduce((s, li) => s + li.amount, 0);
    const first = normalized[0];

    const { error } = await supabase
      .from("sales")
      .update({
        customer_name: customerName,
        sale_date: new Date(saleDate).toISOString(),
        team_id: teamId || null,
        team_name: team?.name ?? null,
        deal_size: dealSize,
        carrier: first.carrier || (first.kind === "addon" ? "Add-on" : ""),
        product: first.product,
        line_items: normalized,
        add_ons: [],
        add_on_amounts: {},
        lead_source: leadSource || null,
        notes: notes || null,
      })
      .eq("id", sale.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sale updated");
    navigate({ to: "/sales" });
  };

  const onDelete = async () => {
    if (!sale || !isAdmin) return;
    if (!confirm(`Delete sale ${sale.sale_id}? This cannot be undone.`)) return;
    const { error } = await supabase.from("sales").delete().eq("id", sale.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sale deleted");
    navigate({ to: "/sales" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (notFound || !sale) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="surface-card p-8">
          <h1 className="text-xl font-semibold">Sale not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or you don't have access.</p>
          <Button asChild className="mt-4"><Link to="/sales">Back to sales</Link></Button>
        </div>
      </div>
    );
  }
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="surface-card p-8">
          <h1 className="text-xl font-semibold">No edit access</h1>
          <p className="mt-2 text-sm text-muted-foreground">You don't have permission to edit this sale.</p>
          <Button asChild className="mt-4"><Link to="/sales">Back to sales</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link to="/sales"><ArrowLeft className="mr-1 h-4 w-4" /> All sales</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Edit sale</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sale ID: <span className="num">{sale.sale_id}</span> · Agent: {sale.agent_name}</p>
      </div>

      <form onSubmit={onSave} className="surface-card space-y-8 p-6 sm:p-8">
        <Section title="Sale details">
          <Field label="Customer name">
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </Field>
          <Field label="Date of sale">
            <Input type="datetime-local" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </Field>
          <Field label="Team">
            <Select value={teamId || "__none"} onValueChange={(v) => setTeamId(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— No team —</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Line items</h2>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>
              <Plus className="mr-1 h-3 w-3" /> Add line item
            </Button>
          </div>
          <div className="space-y-3">
            {lineItems.map((li, idx) => (
              <LineItemRow
                key={li.id}
                index={idx}
                item={li}
                carriers={carriers}
                products={products}
                addOns={addOns}
                canRemove={lineItems.length > 1}
                onKindChange={(v) => updateLine(li.id, { kind: v, carrier: "", product: "" })}
                onCarrierChange={(v) => updateLine(li.id, { carrier: v, product: "" })}
                onProductChange={(v) => updateLine(li.id, { product: v })}
                onAmountChange={(v) => updateLine(li.id, { amount: v })}
                onRemove={() => removeLine(li.id)}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="num text-base font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>

        <Section title="Lead info">
          <Field label="Lead source">
            <Select value={leadSource || "__none"} onValueChange={(v) => setLeadSource(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— None —</SelectItem>
                {leadSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block">Notes</Label>
            <Textarea rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Section>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-between">
          {isAdmin ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          ) : <div />}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button asChild variant="secondary"><Link to="/sales">Cancel</Link></Button>
            <Button type="submit" disabled={saving} className="min-w-[140px]">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save changes</>}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function LineItemRow({
  index,
  item,
  carriers,
  products,
  addOns,
  canRemove,
  onKindChange,
  onCarrierChange,
  onProductChange,
  onAmountChange,
  onRemove,
}: {
  index: number;
  item: LineItem;
  carriers: CarrierOpt[];
  products: ProductOpt[];
  addOns: AddOnOpt[];
  canRemove: boolean;
  onKindChange: (v: LineKind) => void;
  onCarrierChange: (v: string) => void;
  onProductChange: (v: string) => void;
  onAmountChange: (v: string) => void;
  onRemove: () => void;
}) {
  const isAddon = item.kind === "addon";
  const filteredCarriers = item.kind && item.kind !== "addon"
    ? carriers.filter((c) => c.carrier_type === item.kind)
    : [];
  const selectedCarrier = carriers.find((c) => c.name === item.carrier);
  const filteredProducts = isAddon
    ? addOns.map((a) => ({ id: a.id, name: a.name }))
    : selectedCarrier
      ? products.filter((p) => p.carrier_id === selectedCarrier.id)
      : [];

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Item #{index + 1}</span>
        {canRemove && (
          <Button type="button" size="sm" variant="ghost" onClick={onRemove} className="h-7 px-2 text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs">Type</Label>
          <Select value={item.kind || undefined} onValueChange={(v) => onKindChange(v as LineKind)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="health">Health Insurance</SelectItem>
              <SelectItem value="life">Life Insurance</SelectItem>
              <SelectItem value="addon">Add-on</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isAddon && (
          <div>
            <Label className="mb-1 block text-xs">Carrier</Label>
            <Select value={item.carrier || undefined} onValueChange={onCarrierChange} disabled={!item.kind}>
              <SelectTrigger>
                <SelectValue placeholder={item.kind ? "Select carrier" : "Pick a type first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCarriers.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                {item.kind && filteredCarriers.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">No carriers for this type</div>
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <Label className="mb-1 block text-xs">{isAddon ? "Add-on" : "Product"}</Label>
          <Select
            value={item.product || undefined}
            onValueChange={onProductChange}
            disabled={isAddon ? !item.kind : !item.carrier}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isAddon
                  ? (item.kind ? "Select add-on" : "Pick a type first")
                  : (item.carrier ? "Select product" : "Pick a carrier first")
              } />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
              {((isAddon && item.kind && filteredProducts.length === 0) ||
                (!isAddon && item.carrier && filteredProducts.length === 0)) && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {isAddon ? "No add-ons available" : "No products for this carrier"}
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs">Annual Premium ($)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={item.amount}
            onChange={(e) => onAmountChange(e.target.value)}
          />
        </div>
      </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
