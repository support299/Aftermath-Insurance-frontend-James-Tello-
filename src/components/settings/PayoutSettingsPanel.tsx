import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  createCommission,
  createCompLevel,
  fetchAdminCommissions,
  fetchAdminMilestones,
  fetchTrackerConfig,
  updateAdminMilestone,
  updateCommission,
  updateTrackerConfig,
  type CompLevel,
  type ProductCommissionRow,
} from "@/lib/payouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export function PayoutSettingsPanel() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [loading, setLoading] = useState(true);
  const [levels, setLevels] = useState<CompLevel[]>([]);
  const [commissions, setCommissions] = useState<ProductCommissionRow[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; carrier_id: string | null }[]>([]);
  const [addons, setAddons] = useState<{ id: string; name: string }[]>([]);
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [milestones, setMilestones] = useState<Awaited<ReturnType<typeof fetchAdminMilestones>>["milestones"]>([]);
  const [tracker, setTracker] = useState({
    foundation_weeks: 13,
    beacon_weeks: 13,
    phase_goal: 250000,
    blended_income_rate: 0.15,
  });
  const [edits, setEdits] = useState<Record<string, Partial<ProductCommissionRow>>>({});
  const [newProductId, setNewProductId] = useState("");
  const [newAddonId, setNewAddonId] = useState("");
  const [newMonths, setNewMonths] = useState("9");
  const [saving, setSaving] = useState(false);
  const [levelForm, setLevelForm] = useState({ code: "", name: "" });

  const carrierName = useMemo(
    () => new Map(carriers.map((c) => [c.id, c.name])),
    [carriers],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [comm, ms, cfg, prods, ao, cars] = await Promise.all([
        fetchAdminCommissions(token),
        fetchAdminMilestones(token),
        fetchTrackerConfig(token),
        supabase.from("products").select("id, name, carrier_id").eq("active", true).order("name"),
        supabase.from("add_ons").select("id, name").eq("active", true).order("name"),
        supabase.from("carriers").select("id, name").eq("active", true),
      ]);
      setLevels(comm.levels);
      setCommissions(comm.commissions);
      setMilestones(ms.milestones);
      setTracker(cfg);
      setProducts(prods.data ?? []);
      setAddons(ao.data ?? []);
      setCarriers(cars.data ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load payout settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const activeLevels = levels.filter((l) => l.is_active);

  const patchEdit = (id: string, patch: Partial<ProductCommissionRow>) => {
    setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  };

  const saveCommission = async (row: ProductCommissionRow) => {
    const patch = edits[row.id];
    if (!patch) return;
    setSaving(true);
    try {
      const updated = await updateCommission(
        row.id,
        {
          advance_months: patch.advance_months ?? row.advance_months,
          rates: (patch.rates as Record<string, number>) ?? row.rates,
          is_active: patch.is_active ?? row.is_active,
          label: patch.label ?? row.label,
        },
        token,
      );
      setCommissions((rows) => rows.map((r) => (r.id === row.id ? updated : r)));
      setEdits((e) => {
        const next = { ...e };
        delete next[row.id];
        return next;
      });
      toast.success("Commission saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addCommission = async (kind: "product" | "addon") => {
    setSaving(true);
    try {
      const rates: Record<string, number> = {};
      for (const lv of activeLevels) rates[lv.code] = 0;
      const created = await createCommission(
        {
          product_id: kind === "product" ? newProductId || null : null,
          add_on_id: kind === "addon" ? newAddonId || null : null,
          advance_months: Number(newMonths) || 6,
          rates,
        },
        token,
      );
      setCommissions((rows) => [...rows, created]);
      setNewProductId("");
      setNewAddonId("");
      toast.success("Commission row added — set rates below");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSaving(false);
    }
  };

  const addLevel = async () => {
    if (!levelForm.code.trim() || !levelForm.name.trim()) return;
    try {
      const lv = await createCompLevel(
        { code: levelForm.code.trim(), name: levelForm.name.trim(), sort_order: levels.length + 1 },
        token,
      );
      setLevels((xs) => [...xs, lv]);
      setLevelForm({ code: "", name: "" });
      toast.success("Comp level created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const saveTracker = async () => {
    try {
      const cfg = await updateTrackerConfig(tracker, token);
      setTracker(cfg);
      toast.success("Tracker config saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const configuredProductIds = new Set(commissions.map((c) => c.product_id).filter(Boolean));
  const configuredAddonIds = new Set(commissions.map((c) => c.add_on_id).filter(Boolean));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comp levels</CardTitle>
          <CardDescription>
            Assign one level per agent (Settings → Users). Rates below key off the level code.
            Levels are not shown to other agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {levels.map((lv) => (
              <span
                key={lv.id}
                className="rounded-md border px-3 py-1 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">{lv.code}</span>{" "}
                {lv.name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label>Code</Label>
              <Input
                value={levelForm.code}
                onChange={(e) => setLevelForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="L5"
                className="w-28"
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={levelForm.name}
                onChange={(e) => setLevelForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Level 5"
                className="w-40"
              />
            </div>
            <Button type="button" variant="secondary" onClick={addLevel}>
              <Plus className="mr-1 h-4 w-4" /> Add level
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Product payout rates</CardTitle>
          <CardDescription>
            Formula: monthly premium × advance months × rate for the agent&apos;s comp level.
            James will confirm final % — edit anytime here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="min-w-[200px] flex-1">
              <Label>Add product</Label>
              <Select value={newProductId || undefined} onValueChange={setNewProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product…" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p) => !configuredProductIds.has(p.id))
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {carrierName.get(p.carrier_id ?? "") ? `${carrierName.get(p.carrier_id!)!} · ` : ""}
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <Label>Months</Label>
              <Input value={newMonths} onChange={(e) => setNewMonths(e.target.value)} />
            </div>
            <Button
              type="button"
              disabled={!newProductId || saving}
              onClick={() => addCommission("product")}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="min-w-[200px] flex-1">
              <Label>Add add-on</Label>
              <Select value={newAddonId || undefined} onValueChange={setNewAddonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select add-on…" />
                </SelectTrigger>
                <SelectContent>
                  {addons
                    .filter((a) => !configuredAddonIds.has(a.id))
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              disabled={!newAddonId || saving}
              onClick={() => addCommission("addon")}
            >
              Add
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-24">Months</TableHead>
                  {activeLevels.map((lv) => (
                    <TableHead key={lv.id} className="w-24 text-right">
                      {lv.code}
                    </TableHead>
                  ))}
                  <TableHead className="w-20">Active</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((row) => {
                  const e = edits[row.id] ?? {};
                  const rates = (e.rates as Record<string, number>) ?? row.rates ?? {};
                  const months = e.advance_months ?? row.advance_months;
                  const active = e.is_active ?? row.is_active;
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">
                          {row.product_name || row.add_on_name || row.label}
                        </div>
                        {row.carrier_name && (
                          <div className="text-xs text-muted-foreground">{row.carrier_name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20"
                          value={months}
                          onChange={(ev) =>
                            patchEdit(row.id, { advance_months: Number(ev.target.value) || 0 })
                          }
                        />
                      </TableCell>
                      {activeLevels.map((lv) => (
                        <TableCell key={lv.id} className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            className="ml-auto w-20 text-right"
                            value={rates[lv.code] ?? ""}
                            placeholder="0.20"
                            onChange={(ev) => {
                              const v = ev.target.value === "" ? 0 : Number(ev.target.value);
                              patchEdit(row.id, {
                                rates: { ...rates, [lv.code]: v },
                              });
                            }}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Switch
                          checked={active}
                          onCheckedChange={(v) => patchEdit(row.id, { is_active: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={!edits[row.id] || saving}
                          onClick={() => saveCommission(row)}
                        >
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {commissions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4 + activeLevels.length} className="text-center text-muted-foreground">
                      No product rates yet — add products above.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter rates as decimals (e.g. <code>0.28</code> = 28%). Portal example: Health Access 9mo · L/agent ~0.20–0.28.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>13-week tracker</CardTitle>
          <CardDescription>Phase length and submitted-AP goal (default $250K per phase).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>Foundation weeks</Label>
            <Input
              type="number"
              value={tracker.foundation_weeks}
              onChange={(e) =>
                setTracker((t) => ({ ...t, foundation_weeks: Number(e.target.value) || 13 }))
              }
            />
          </div>
          <div>
            <Label>Beacon weeks</Label>
            <Input
              type="number"
              value={tracker.beacon_weeks}
              onChange={(e) =>
                setTracker((t) => ({ ...t, beacon_weeks: Number(e.target.value) || 13 }))
              }
            />
          </div>
          <div>
            <Label>Phase goal ($)</Label>
            <Input
              type="number"
              value={tracker.phase_goal}
              onChange={(e) =>
                setTracker((t) => ({ ...t, phase_goal: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <Label>Blended income rate</Label>
            <Input
              type="number"
              step="0.01"
              value={tracker.blended_income_rate}
              onChange={(e) =>
                setTracker((t) => ({
                  ...t,
                  blended_income_rate: Number(e.target.value) || 0.15,
                }))
              }
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="button" onClick={saveTracker}>
              Save tracker config
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding milestones</CardTitle>
          <CardDescription>Cash bonuses for first sales / AP benchmarks in early weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Cash $</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.milestone_type}</TableCell>
                  <TableCell>
                    <Input
                      className="w-28"
                      type="number"
                      defaultValue={m.threshold}
                      onBlur={async (e) => {
                        try {
                          await updateAdminMilestone(
                            m.id,
                            { threshold: Number(e.target.value) },
                            token,
                          );
                          toast.success("Updated");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      className="w-24"
                      type="number"
                      defaultValue={m.cash_reward}
                      onBlur={async (e) => {
                        try {
                          await updateAdminMilestone(
                            m.id,
                            { cash_reward: Number(e.target.value) },
                            token,
                          );
                          toast.success("Updated");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={async (v) => {
                        try {
                          const updated = await updateAdminMilestone(m.id, { is_active: v }, token);
                          setMilestones((rows) =>
                            rows.map((x) => (x.id === m.id ? { ...x, ...updated } : x)),
                          );
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
