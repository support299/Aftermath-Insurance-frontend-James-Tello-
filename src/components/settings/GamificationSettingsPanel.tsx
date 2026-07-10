import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Calendar, Info, Loader2, Plus, Save, Sparkles, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  CONTEST_METRICS,
  createAdminContest,
  createAdminReward,
  deactivateAdminReward,
  fetchAdminAchievements,
  fetchAdminContests,
  fetchAdminRedemptions,
  fetchAdminRewards,
  reviewAdminRedemption,
  runAchievementEvaluation,
  updateAdminAchievement,
  updateAdminContest,
  updateAdminReward,
  type AdminAchievement,
  type AdminContest,
  type AdminRedemption,
  type AdminReward,
} from "@/lib/gamification-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  AgentBalancesPanel,
  ChallengesAdminPanel,
  EarningRulesPanel,
  LevelsAdminPanel,
} from "@/components/settings/GamificationRulesPanels";

export function GamificationSettingsPanel() {
  return (
    <Tabs defaultValue="redemptions" className="space-y-4">
      <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
        <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
        <TabsTrigger value="rewards">Rewards</TabsTrigger>
        <TabsTrigger value="contests">Contests</TabsTrigger>
        <TabsTrigger value="badges">Badges</TabsTrigger>
        <TabsTrigger value="earning">Earning rules</TabsTrigger>
        <TabsTrigger value="levels">Levels</TabsTrigger>
        <TabsTrigger value="challenges">Challenges</TabsTrigger>
        <TabsTrigger value="agents">Agent balances</TabsTrigger>
      </TabsList>
      <TabsContent value="redemptions"><RedemptionsAdminPanel /></TabsContent>
      <TabsContent value="rewards"><RewardsAdminPanel /></TabsContent>
      <TabsContent value="contests"><ContestsAdminPanel /></TabsContent>
      <TabsContent value="badges"><BadgesAdminPanel /></TabsContent>
      <TabsContent value="earning"><EarningRulesPanel /></TabsContent>
      <TabsContent value="levels"><LevelsAdminPanel /></TabsContent>
      <TabsContent value="challenges"><ChallengesAdminPanel /></TabsContent>
      <TabsContent value="agents"><AgentBalancesPanel /></TabsContent>
    </Tabs>
  );
}

function RedemptionsAdminPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminRedemption[]>([]);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminRedemptions(filter, session?.access_token);
      setRows(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  }, [filter, session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const review = async (id: string, status: AdminRedemption["status"]) => {
    setActing(id);
    try {
      await reviewAdminRedemption(id, status, notes[id] ?? "", session?.access_token);
      toast.success(`Redemption ${status}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Reward redemptions
        </CardTitle>
        <CardDescription>Approve or reject agent reward requests. Rejected requests refund points.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={filter} onValueChange={(v) => setFilter(v as "pending" | "all")}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending only</SelectItem>
            <SelectItem value="all">All statuses</SelectItem>
          </SelectContent>
        </Select>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No redemptions in this view.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium">{r.agent_email || r.agent_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</div>
                    {r.agent_note && <div className="mt-1 text-xs italic text-muted-foreground">"{r.agent_note}"</div>}
                  </TableCell>
                  <TableCell>
                    <span className="mr-1">{r.reward_icon}</span>
                    {r.reward_name}
                  </TableCell>
                  <TableCell>{r.points_cost.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "pending" ? "secondary" : "default"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.status === "pending" ? (
                      <Input
                        placeholder="Admin note (optional)"
                        value={notes[r.id] ?? ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">{r.admin_note || "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => review(r.id, "rejected")}>
                          Reject
                        </Button>
                        <Button size="sm" disabled={acting === r.id} onClick={() => review(r.id, "approved")}>
                          Approve
                        </Button>
                      </div>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" variant="secondary" disabled={acting === r.id} onClick={() => review(r.id, "fulfilled")}>
                        Mark fulfilled
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RewardsAdminPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", icon: "🎁", points_cost: "300" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminRewards(session?.access_token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    const pts = Number(form.points_cost);
    if (!isFinite(pts) || pts <= 0) return toast.error("Enter a valid points cost");
    setAdding(true);
    try {
      await createAdminReward(
        { name: form.name.trim(), description: form.description.trim(), icon: form.icon, points_cost: pts },
        session?.access_token,
      );
      toast.success("Reward added");
      setForm({ name: "", description: "", icon: "🎁", points_cost: "300" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add reward");
    } finally {
      setAdding(false);
    }
  };

  const toggle = async (row: AdminReward) => {
    try {
      await updateAdminReward(row.id, { is_active: !row.is_active }, session?.access_token);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const save = async (row: AdminReward, patch: Partial<AdminReward>) => {
    try {
      await updateAdminReward(row.id, patch, session?.access_token);
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await deactivateAdminReward(id, session?.access_token);
      toast.success("Reward deactivated");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rewards catalog</CardTitle>
        <CardDescription>Manage perks agents can redeem with points.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Coffee gift card" />
          </div>
          <div>
            <Label>Icon</Label>
            <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="w-20" />
          </div>
          <div>
            <Label>Points cost</Label>
            <Input type="number" min={1} value={form.points_cost} onChange={(e) => setForm((f) => ({ ...f, points_cost: e.target.value }))} />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={adding}><Plus className="h-4 w-4" /> Add reward</Button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reward</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <RewardRow key={row.id} row={row} onSave={save} onToggle={toggle} onRemove={remove} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RewardRow({
  row, onSave, onToggle, onRemove,
}: {
  row: AdminReward;
  onSave: (row: AdminReward, patch: Partial<AdminReward>) => void;
  onToggle: (row: AdminReward) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState(row.name);
  const [desc, setDesc] = useState(row.description);
  const [cost, setCost] = useState(String(row.points_cost));
  const [order, setOrder] = useState(String(row.sort_order));
  const dirty = name !== row.name || desc !== row.description || cost !== String(row.points_cost) || order !== String(row.sort_order);

  useEffect(() => {
    setName(row.name);
    setDesc(row.description);
    setCost(String(row.points_cost));
    setOrder(String(row.sort_order));
  }, [row]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-xl">{row.icon}</span>
          <div className="space-y-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Input className="text-xs" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" />
          </div>
        </div>
      </TableCell>
      <TableCell><Input type="number" min={1} className="w-24" value={cost} onChange={(e) => setCost(e.target.value)} /></TableCell>
      <TableCell><Input type="number" className="w-16" value={order} onChange={(e) => setOrder(e.target.value)} /></TableCell>
      <TableCell>
        <Switch checked={row.is_active} onCheckedChange={() => onToggle(row)} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          {dirty && (
            <Button size="sm" onClick={() => onSave(row, {
              name: name.trim(),
              description: desc.trim(),
              points_cost: Number(cost),
              sort_order: Number(order),
            })}>
              <Save className="h-4 w-4" />
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate reward?</AlertDialogTitle>
                <AlertDialogDescription>Agents will no longer see this reward in the store.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onRemove(row.id)}>Deactivate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ContestsAdminPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminContest[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    description: "",
    prize_description: "",
    metric: "revenue",
    target_value: "",
    start_date: today,
    end_date: today,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminContests(session?.access_token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load contests");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    setAdding(true);
    try {
      await createAdminContest({
        title: form.title.trim(),
        description: form.description.trim(),
        prize_description: form.prize_description.trim(),
        metric: form.metric,
        target_value: form.target_value ? Number(form.target_value) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: true,
      }, session?.access_token);
      toast.success("Contest created");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contest");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: string, data: Partial<AdminContest>) => {
    try {
      await updateAdminContest(id, data, session?.access_token);
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contests</CardTitle>
        <CardDescription>
          Create company-wide contests visible to all agents. Managers can create separate team-only contests from their Settings page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div>
            <Label>Metric</Label>
            <Select value={form.metric} onValueChange={(v) => setForm((f) => ({ ...f, metric: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTEST_METRICS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Target (optional)</Label><Input type="number" value={form.target_value} onChange={(e) => setForm((f) => ({ ...f, target_value: e.target.value }))} /></div>
          <div><Label>Prize</Label><Input value={form.prize_description} onChange={(e) => setForm((f) => ({ ...f, prize_description: e.target.value }))} /></div>
          <div><Label>Start date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
          <div><Label>End date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
          <div><Button type="submit" disabled={adding}><Plus className="h-4 w-4" /> Add global contest</Button></div>
        </form>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-4">
            {rows.map((c) => (
              <ContestCard key={c.id} contest={c} onPatch={patch} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContestCard({ contest, onPatch }: { contest: AdminContest; onPatch: (id: string, data: Partial<AdminContest>) => void }) {
  const [title, setTitle] = useState(contest.title);
  const [prize, setPrize] = useState(contest.prize_description);
  const dirty = title !== contest.title || prize !== contest.prize_description;

  useEffect(() => {
    setTitle(contest.title);
    setPrize(contest.prize_description);
  }, [contest]);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={contest.scope === "global" ? "default" : "secondary"}>
              {contest.scope === "global" ? "Global" : "Team"}
            </Badge>
            {contest.team_name && <span className="text-xs text-muted-foreground">{contest.team_name}</span>}
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />
          <Input value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="Prize description" />
          <p className="text-xs text-muted-foreground">
            {contest.metric.replace("_", " ")} · {contest.start_date} → {contest.end_date}
            {contest.target_value != null && ` · target ${contest.target_value.toLocaleString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={contest.is_active} onCheckedChange={(v) => onPatch(contest.id, { is_active: v })} />
          <Badge variant={contest.is_active ? "default" : "secondary"}>{contest.is_active ? "Active" : "Inactive"}</Badge>
          {dirty && (
            <Button size="sm" onClick={() => onPatch(contest.id, { title: title.trim(), prize_description: prize.trim() })}>
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgesAdminPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState<"weekly" | "monthly" | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchAdminAchievements(session?.access_token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load badges");
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, data: Partial<AdminAchievement>) => {
    try {
      await updateAdminAchievement(id, data, session?.access_token);
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const evaluate = async (monthly: boolean) => {
    setEvaluating(monthly ? "monthly" : "weekly");
    setLastResult(null);
    try {
      const { awarded: n, elapsedMs } = await runAchievementEvaluation(monthly, session?.access_token);
      const timing = elapsedMs != null ? ` (${(elapsedMs / 1000).toFixed(1)}s)` : "";
      const msg =
        n > 0
          ? `Awarded ${n} new badge(s). Agents also received bonus points.${timing}`
          : `No new badges this run — winners may already have this period's awards.${timing}`;
      setLastResult(msg);
      toast.success(n > 0 ? `Awarded ${n} new badge(s)` : "Done — 0 new awards");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(null);
    }
  };

  const periodLabel = (p: string) =>
    p === "all_time" ? "Lifetime" : p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : "Monthly";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How badges work
          </CardTitle>
          <CardDescription>Read this first — badge rules are preset; you control points and on/off.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Automatic badges</strong> (e.g. First Blood, lifetime milestones)
            fire when an agent logs a sale. <strong className="text-foreground">Competitive badges</strong> (e.g. Top Closer)
            need you to click the award buttons below — there is no nightly cron yet.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong className="text-foreground">Daily / weekly / monthly</strong> — agents can earn again each new period. Their UI shows “Earned this week” vs “Earned before”.</li>
            <li><strong className="text-foreground">Lifetime</strong> — once unlocked, stays unlocked forever.</li>
            <li><strong className="text-foreground">Points</strong> — added to the agent’s store balance when a badge is newly awarded for that period (not twice same period).</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Award evaluation</CardTitle>
          <CardDescription>Run competitive weekly (and optional monthly) badge winners.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" disabled={evaluating !== null} onClick={() => evaluate(false)}>
              {evaluating === "weekly" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running weekly awards…</>
              ) : (
                "Run weekly awards"
              )}
            </Button>
            <Button className="gap-2" variant="secondary" disabled={evaluating !== null} onClick={() => evaluate(true)}>
              {evaluating === "monthly" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Running weekly + monthly…</>
              ) : (
                "Run weekly + monthly awards"
              )}
            </Button>
          </div>
          {lastResult && <p className="text-sm text-muted-foreground">{lastResult}</p>}
          <p className="text-xs text-muted-foreground">
            Usually completes in a few seconds. Awards Top Closer, Money Maker, Kill Streak, Comeback Kid, and Ghost.
            Lifetime badges (Sharp Shooter, On Fire) unlock automatically when agents log sales.
            Monthly button also runs Rising Star and Iron Man (if active).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badge catalog</CardTitle>
          <CardDescription>Edit display text and points. Toggle off badges you don’t want in play.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <BadgeAdminCard key={row.id} row={row} periodLabel={periodLabel} onPatch={patch} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BadgeAdminCard({
  row, periodLabel, onPatch,
}: {
  row: AdminAchievement;
  periodLabel: (p: string) => string;
  onPatch: (id: string, data: Partial<AdminAchievement>) => void;
}) {
  const [name, setName] = useState(row.name);
  const [desc, setDesc] = useState(row.description);
  const [pts, setPts] = useState(row.points_reward != null ? String(row.points_reward) : "");
  const dirty = name !== row.name || desc !== row.description || pts !== (row.points_reward != null ? String(row.points_reward) : "");

  useEffect(() => {
    setName(row.name);
    setDesc(row.description);
    setPts(row.points_reward != null ? String(row.points_reward) : "");
  }, [row]);

  const isAuto = row.trigger === "automatic_sale";

  return (
    <div className={`rounded-lg border p-4 ${!row.is_active ? "opacity-60" : ""} ${!row.implemented ? "border-dashed border-warning/40" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="text-3xl">{row.icon}</span>
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{periodLabel(row.period)}</Badge>
              <Badge variant={isAuto ? "default" : "secondary"} className="gap-1">
                {isAuto ? <Zap className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {row.trigger_label}
              </Badge>
              {!row.implemented && <Badge variant="outline" className="text-warning">Not implemented</Badge>}
              {!row.is_active && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Display name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Points on earn</Label>
                <Input
                  type="number"
                  min={0}
                  className="w-full"
                  value={pts}
                  placeholder="Default from rules"
                  onChange={(e) => setPts(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Short description (shown to agents)</Label>
              <Input className="text-sm" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground font-mono">{row.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={row.is_active} onCheckedChange={(v) => onPatch(row.id, { is_active: v })} />
          {dirty && (
            <Button size="sm" onClick={() => onPatch(row.id, {
              name: name.trim(),
              description: desc.trim(),
              points_reward: pts.trim() === "" ? null : Number(pts),
            })}>
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 rounded-md bg-muted/30 p-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How it’s calculated</p>
          <p className="mt-1 text-foreground/90">{row.rule}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What agents see</p>
          <p className="mt-1 text-foreground/90">{row.display_hint}</p>
          {row.threshold != null && (
            <p className="mt-2 text-xs text-muted-foreground">Threshold: {row.threshold}</p>
          )}
        </div>
      </div>
    </div>
  );
}
