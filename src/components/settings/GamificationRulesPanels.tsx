import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Coins, Info, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  adjustAgentPoints,
  adjustAgentXp,
  CHALLENGE_METRICS,
  fetchAdminAgentProgress,
  fetchAdminLevels,
  fetchGamificationConfig,
  recalculateAllGamification,
  updateAdminLevel,
  updateGamificationConfig,
  type AdminAgentProgress,
  type AdminLevel,
  type EarningRules,
  type WeeklyChallengeDef,
} from "@/lib/gamification-admin";
import {
  estimateSalePoints,
  estimateSaleXp,
  EXAMPLE_SALE,
} from "@/lib/earning-rules";
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
import { AgentRankMark } from "@/components/gamification/AgentRankMark";

const XP_RULES: {
  key: keyof EarningRules;
  label: string;
  hint: string;
}[] = [
  {
    key: "xp_total_premium_mult",
    label: "XP per $1 total premium",
    hint: "Every dollar of deal size (total premium) earns this much XP.",
  },
  {
    key: "xp_life_bonus_mult",
    label: "Extra XP per $1 life premium",
    hint: "Bonus on top — uses life amounts from sale line items.",
  },
  {
    key: "xp_health_bonus_mult",
    label: "Extra XP per $1 health premium",
    hint: "Bonus on health line items.",
  },
  {
    key: "xp_addon_bonus_mult",
    label: "Extra XP per $1 add-on premium",
    hint: "Bonus on add-on line items.",
  },
  {
    key: "xp_per_sale_base",
    label: "Flat XP per sale",
    hint: "Awarded on every sale logged, regardless of size.",
  },
];

const POINTS_RULES: {
  key: keyof EarningRules;
  label: string;
  hint: string;
}[] = [
  {
    key: "points_per_sale_base",
    label: "Base points per sale",
    hint: "Starting points every time an agent logs a sale.",
  },
  {
    key: "points_per_100_premium",
    label: "Points per $100 premium",
    hint: "Extra store points based on deal size (rounded down per $100).",
  },
  {
    key: "points_per_sale_min",
    label: "Minimum points per sale",
    hint: "Floor — small deals still earn at least this many points.",
  },
];

function RuleField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="number"
        step="any"
        className="mt-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function EarningRulesPanel() {
  const { session } = useAuth();
  const [rules, setRules] = useState<EarningRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchGamificationConfig(session?.access_token);
      setRules(cfg.earning_rules);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load rules");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!rules) return;
    setSaving(true);
    try {
      await updateGamificationConfig({ earning_rules: rules }, session?.access_token);
      toast.success("Earning rules saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const recalc = async () => {
    setRecalculating(true);
    try {
      const n = await recalculateAllGamification(session?.access_token);
      toast.success(`Recalculated XP for ${n} agents`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recalculate failed");
    } finally {
      setRecalculating(false);
    }
  };

  if (loading || !rules) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const previewXp = estimateSaleXp(rules);
  const previewPts = estimateSalePoints(rules);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Two currencies
          </CardTitle>
          <CardDescription>Agents earn from sales automatically. You set the math here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border border-border/60 p-3">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">XP → levels & leaderboards</p>
              <p className="mt-1">Recalculated from all sales when a sale is logged. Change rules + recalculate to update everyone.</p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border border-border/60 p-3">
            <Coins className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Points → rewards store</p>
              <p className="mt-1">Granted per sale at log time. Badges and challenges add bonus points separately.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={save} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              XP from sales
            </CardTitle>
            <CardDescription>Controls how fast agents level up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {XP_RULES.map(({ key, label, hint }) => (
                <RuleField
                  key={key}
                  label={label}
                  hint={hint}
                  value={rules[key]}
                  onChange={(v) => setRules((r) => r && ({ ...r, [key]: v }))}
                />
              ))}
            </div>
            <p className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <strong className="text-foreground">Live preview:</strong> ${EXAMPLE_SALE.total} deal
              (${EXAMPLE_SALE.life} life + ${EXAMPLE_SALE.health} health) →{" "}
              <strong className="text-foreground">{previewXp.toLocaleString()} XP</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Store points from sales
            </CardTitle>
            <CardDescription>Points balance agents spend on rewards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {POINTS_RULES.map(({ key, label, hint }) => (
                <RuleField
                  key={key}
                  label={label}
                  hint={hint}
                  value={rules[key]}
                  onChange={(v) => setRules((r) => r && ({ ...r, [key]: v }))}
                />
              ))}
              <RuleField
                label="Default badge points"
                hint="Fallback when a badge has no custom points set on the Badges tab."
                value={rules.default_badge_points}
                onChange={(v) => setRules((r) => r && ({ ...r, default_badge_points: v }))}
              />
            </div>
            <p className="rounded-md bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <strong className="text-foreground">Live preview:</strong> ${EXAMPLE_SALE.pointsPremium} premium sale →{" "}
              <strong className="text-foreground">{previewPts} points</strong>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4" /> Save rules
              </Button>
              <Button type="button" variant="secondary" disabled={recalculating} onClick={recalc}>
                {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Recalculate all XP
              </Button>
            </div>
            <p className="max-w-md text-xs text-muted-foreground">
              After changing <strong>XP</strong> rules, run recalculate so existing agents get new totals from their sale history.
              <strong> Points</strong> from past sales are not recalculated — only new sales use updated point rules.
            </p>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export function LevelsAdminPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminLevels(session?.access_token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load levels");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const save = async (row: AdminLevel, patch: Partial<AdminLevel>) => {
    try {
      await updateAdminLevel(row.id, patch, session?.access_token);
      toast.success("Level saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Level ladder</CardTitle>
        <CardDescription>
          XP from sales (Earning rules) determines when agents hit each tier. Lower XP required = faster promotions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>XP required</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <LevelRow key={row.id} row={row} onSave={save} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LevelRow({ row, onSave }: { row: AdminLevel; onSave: (r: AdminLevel, p: Partial<AdminLevel>) => void }) {
  const [name, setName] = useState(row.name);
  const [xp, setXp] = useState(String(row.xp_required));
  const dirty = name !== row.name || xp !== String(row.xp_required);
  useEffect(() => {
    setName(row.name);
    setXp(String(row.xp_required));
  }, [row]);
  return (
    <TableRow>
      <TableCell>{row.rank}</TableCell>
      <TableCell><Input value={name} onChange={(e) => setName(e.target.value)} /></TableCell>
      <TableCell><Input type="number" className="w-28" value={xp} onChange={(e) => setXp(e.target.value)} /></TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.tier_type}</TableCell>
      <TableCell>
        {dirty && (
          <Button size="sm" onClick={() => onSave(row, { name: name.trim(), xp_required: Number(xp) })}>
            <Save className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ChallengesAdminPanel() {
  const { session } = useAuth();
  const [challenges, setChallenges] = useState<WeeklyChallengeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await fetchGamificationConfig(session?.access_token);
      setChallenges(cfg.weekly_challenges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await updateGamificationConfig({ weekly_challenges: challenges }, session?.access_token);
      toast.success("Challenges saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const add = () => {
    setChallenges((c) => [
      ...c,
      {
        id: `challenge-${Date.now()}`,
        title: "New challenge",
        description: "",
        metric: "sale_days",
        target: 1,
        points: 25,
        is_active: true,
        sort_order: c.length + 1,
      },
    ]);
  };

  const remove = (id: string) => setChallenges((c) => c.filter((x) => x.id !== id));

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly challenges</CardTitle>
        <CardDescription>
          Bonus store points for weekly goals (e.g. log sales 5 days). Progress resets each Monday; points pay out automatically when targets are met.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.map((c, i) => (
          <div key={c.id} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-2">
            <Input value={c.title} onChange={(e) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Title" />
            <Select value={c.metric} onValueChange={(v) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, metric: v } : x))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHALLENGE_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={c.description} onChange={(e) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" />
            <div className="flex gap-2">
              <Input type="number" placeholder="Target" value={c.target} onChange={(e) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, target: Number(e.target.value) } : x))} />
              <Input type="number" placeholder="Points" value={c.points} onChange={(e) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, points: Number(e.target.value) } : x))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={c.is_active} onCheckedChange={(v) => setChallenges((list) => list.map((x, j) => j === i ? { ...x, is_active: v } : x))} />
              <span className="text-xs text-muted-foreground">Active</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={add}><Plus className="h-4 w-4" /> Add challenge</Button>
          <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> Save challenges</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentBalancesPanel() {
  const { session } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  const [rows, setRows] = useState<AdminAgentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [pointDeltas, setPointDeltas] = useState<Record<string, string>>({});
  const [xpDeltas, setXpDeltas] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminAgentProgress(debouncedSearch, session?.access_token, page, pageSize);
      setRows(res.agents);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const adjustPts = async (agentId: string) => {
    const amount = Number(pointDeltas[agentId]);
    if (!isFinite(amount) || amount === 0) return toast.error("Enter a non-zero point amount");
    setActing(agentId);
    try {
      await adjustAgentPoints(agentId, amount, notes[agentId] ?? "", session?.access_token);
      toast.success("Points updated");
      setPointDeltas((p) => ({ ...p, [agentId]: "" }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  const adjustXp = async (agentId: string) => {
    const amount = Number(xpDeltas[agentId]);
    if (!isFinite(amount) || amount === 0) return toast.error("Enter a non-zero XP bonus amount");
    setActing(agentId);
    try {
      await adjustAgentXp(agentId, amount, session?.access_token);
      toast.success("Bonus XP updated");
      setXpDeltas((p) => ({ ...p, [agentId]: "" }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent balances</CardTitle>
        <CardDescription>Grant or deduct points and bonus XP. Bonus XP persists across sale recalculations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
          <Table className={loading ? "opacity-60" : undefined}>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.agent_id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AgentRankMark
                        levelRank={r.level_rank}
                        levelName={r.level_name}
                        levelTier={r.level_tier}
                        size="sm"
                      />
                      <div>
                        <div className="font-medium">{r.display_name}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{r.level_name}</TableCell>
                  <TableCell>
                    <div>{r.total_xp.toLocaleString()} total</div>
                    <div className="text-xs text-muted-foreground">
                      {r.sales_xp.toLocaleString()} from sales
                      {(r.bonus_xp ?? 0) !== 0 && ` · ${(r.bonus_xp ?? 0).toLocaleString()} bonus`}
                    </div>
                  </TableCell>
                  <TableCell>{r.points_balance.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <div className="flex gap-1">
                        <Input placeholder="± points" className="h-8" value={pointDeltas[r.agent_id] ?? ""} onChange={(e) => setPointDeltas((p) => ({ ...p, [r.agent_id]: e.target.value }))} />
                        <Button size="sm" disabled={acting === r.agent_id} onClick={() => adjustPts(r.agent_id)}>Pts</Button>
                      </div>
                      <div className="flex gap-1">
                        <Input placeholder="± bonus XP" className="h-8" value={xpDeltas[r.agent_id] ?? ""} onChange={(e) => setXpDeltas((p) => ({ ...p, [r.agent_id]: e.target.value }))} />
                        <Button size="sm" variant="secondary" disabled={acting === r.agent_id} onClick={() => adjustXp(r.agent_id)}>XP</Button>
                      </div>
                      <Input placeholder="Note (optional)" className="h-8 text-xs" value={notes[r.agent_id] ?? ""} onChange={(e) => setNotes((p) => ({ ...p, [r.agent_id]: e.target.value }))} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 0 ? "No agents" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={page * pageSize >= total || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
