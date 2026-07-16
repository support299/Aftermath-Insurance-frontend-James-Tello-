import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  createManagerReward,
  fetchManagerRewards,
  updateManagerReward,
  type ManagedTeam,
} from "@/lib/gamification-manager";
import type { AdminReward } from "@/lib/gamification-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function ManagerRewardsPanel() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AdminReward[]>([]);
  const [teams, setTeams] = useState<ManagedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    icon: "🎁",
    points_cost: "500",
    team_id: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchManagerRewards(session?.access_token);
      setRows(data.rewards);
      setTeams(data.teams);
      setForm((f) => (
        f.team_id || data.teams.length !== 1
          ? f
          : { ...f, team_id: data.teams[0].id }
      ));
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
    if (!form.team_id) return toast.error("Select a team");
    const pts = Number(form.points_cost);
    if (!Number.isFinite(pts) || pts <= 0) return toast.error("Points cost must be positive");
    setAdding(true);
    try {
      await createManagerReward({
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || "🎁",
        points_cost: pts,
        team_id: form.team_id,
        is_active: true,
      }, session?.access_token);
      toast.success("Team reward created");
      setForm((f) => ({ ...f, name: "", description: "", points_cost: "500" }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create reward");
    } finally {
      setAdding(false);
    }
  };

  const patch = async (id: string, data: Partial<AdminReward>) => {
    try {
      await updateManagerReward(id, data, session?.access_token);
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
          <CardTitle>Team rewards</CardTitle>
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
        <CardTitle>Team rewards store</CardTitle>
        <CardDescription>
          Add swag / prizes your team can redeem with points. Only agents on that team see these —
          company-wide store items stay admin-managed.
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
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. AirPods"
            />
          </div>
          <div>
            <Label>Points cost</Label>
            <Input
              type="number"
              min={1}
              value={form.points_cost}
              onChange={(e) => setForm((f) => ({ ...f, points_cost: e.target.value }))}
            />
          </div>
          <div>
            <Label>Icon</Label>
            <Input
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              maxLength={8}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <Button type="submit" disabled={adding}>
              <Plus className="h-4 w-4" /> Add team reward
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team rewards yet. Create one above.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <ManagerRewardCard key={r.id} reward={r} onPatch={patch} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManagerRewardCard({
  reward, onPatch,
}: {
  reward: AdminReward;
  onPatch: (id: string, data: Partial<AdminReward>) => void;
}) {
  const [name, setName] = useState(reward.name);
  const [description, setDescription] = useState(reward.description);
  const [pointsCost, setPointsCost] = useState(String(reward.points_cost));
  const dirty =
    name !== reward.name ||
    description !== reward.description ||
    Number(pointsCost) !== reward.points_cost;

  useEffect(() => {
    setName(reward.name);
    setDescription(reward.description);
    setPointsCost(String(reward.points_cost));
  }, [reward]);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{reward.icon}</span>
            <Badge variant="secondary">Team</Badge>
            {reward.team_name && <span className="text-xs text-muted-foreground">{reward.team_name}</span>}
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-semibold" />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Points</Label>
            <Input
              type="number"
              className="w-28"
              value={pointsCost}
              onChange={(e) => setPointsCost(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={reward.is_active} onCheckedChange={(v) => onPatch(reward.id, { is_active: v })} />
          <Badge variant={reward.is_active ? "default" : "secondary"}>
            {reward.is_active ? "Active" : "Inactive"}
          </Badge>
          {dirty && (
            <Button
              size="sm"
              onClick={() => {
                const pts = Number(pointsCost);
                if (!Number.isFinite(pts) || pts <= 0) {
                  toast.error("Points cost must be positive");
                  return;
                }
                onPatch(reward.id, {
                  name: name.trim(),
                  description: description.trim(),
                  points_cost: pts,
                });
              }}
            >
              <Save className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
