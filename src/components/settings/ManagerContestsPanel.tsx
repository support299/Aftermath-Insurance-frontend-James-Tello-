import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  CONTEST_METRICS,
  createManagerContest,
  fetchManagerContests,
  updateManagerContest,
  type ManagedTeam,
} from "@/lib/gamification-manager";
import type { AdminContest } from "@/lib/gamification-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ManagerContestsPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminContest[]>([]);
  const [teams, setTeams] = useState<ManagedTeam[]>([]);
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
    team_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchManagerContests(session?.access_token);
      setRows(data.contests);
      setTeams(data.teams);
      setForm((f) => (
        f.team_id || data.teams.length !== 1
          ? f
          : { ...f, team_id: data.teams[0].id }
      ));
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
    if (!form.team_id) return toast.error("Select a team");
    setAdding(true);
    try {
      await createManagerContest({
        title: form.title.trim(),
        description: form.description.trim(),
        prize_description: form.prize_description.trim(),
        metric: form.metric,
        target_value: form.target_value ? Number(form.target_value) : null,
        start_date: form.start_date,
        end_date: form.end_date,
        team_id: form.team_id,
        is_active: true,
      }, session?.access_token);
      toast.success("Team contest created");
      setForm((f) => ({
        ...f,
        title: "",
        description: "",
        prize_description: "",
        target_value: "",
      }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contest");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: string, data: Partial<AdminContest>) => {
    try {
      await updateManagerContest(id, data, session?.access_token);
      toast.success("Saved");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (!loading && teams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team contests</CardTitle>
          <CardDescription>
            You are not assigned as a manager on any team yet. Ask an admin to add you under Settings → Teams.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team contests</CardTitle>
        <CardDescription>
          Create contests for agents on your team only. Company-wide contests are managed by admins.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={add} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
          <div>
            <Label>Team</Label>
            <Select
              value={form.team_id}
              onValueChange={(v) => setForm((f) => ({ ...f, team_id: v }))}
              disabled={teams.length <= 1}
            >
              <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div><Button type="submit" disabled={adding}><Plus className="h-4 w-4" /> Add team contest</Button></div>
        </form>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team contests yet. Create one above.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((c) => (
              <ManagerContestCard key={c.id} contest={c} onPatch={patch} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManagerContestCard({
  contest, onPatch,
}: {
  contest: AdminContest;
  onPatch: (id: string, data: Partial<AdminContest>) => void;
}) {
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
            <Badge variant="secondary">Team</Badge>
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
