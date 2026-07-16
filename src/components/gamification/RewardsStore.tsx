import { useState } from "react";
import { Gift, Lock } from "lucide-react";
import type { RedemptionInfo, RewardInfo } from "@/lib/gamification";
import { redeemReward } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABELS: Record<RedemptionInfo["status"], string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  fulfilled: "Fulfilled",
};

const STATUS_COLORS: Record<RedemptionInfo["status"], string> = {
  pending: "text-[var(--warning)]",
  approved: "text-[var(--success)]",
  rejected: "text-destructive",
  fulfilled: "text-[var(--gold)]",
};

function isTeamReward(reward: Pick<RewardInfo, "scope"> | null | undefined) {
  return reward?.scope === "team";
}

function approverLabel(reward: Pick<RewardInfo, "scope"> | null | undefined) {
  return isTeamReward(reward) ? "your team manager" : "an admin";
}

export function RewardsStore({
  rewards,
  redemptions,
  pointsBalance,
  accessToken,
  onRedeemed,
}: {
  rewards: RewardInfo[];
  redemptions: RedemptionInfo[];
  pointsBalance: number;
  accessToken?: string;
  onRedeemed: (redemption: RedemptionInfo) => void;
}) {
  const [selected, setSelected] = useState<RewardInfo | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await redeemReward(selected.id, accessToken, note);
      const redemption: RedemptionInfo = {
        id: result.id,
        reward_id: selected.id,
        reward_name: result.reward_name,
        reward_icon: selected.icon,
        points_cost: result.points_cost,
        status: result.status,
        agent_note: note.trim(),
        admin_note: "",
        team_name: selected.team_name ?? null,
        scope: selected.scope ?? "global",
        created_at: new Date().toISOString(),
        reviewed_at: null,
      };
      setSelected(null);
      setNote("");
      onRedeemed(redemption);
      toast.success(
        `Redeemed ${result.reward_name} — pending ${approverLabel(selected)} approval`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redeem reward");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="game-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Gift className="h-5 w-5 text-[var(--game-orange)]" />
              Rewards Store
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Company rewards need admin approval · Team rewards need your team manager
            </p>
          </div>
          <div className="rounded-lg border border-[var(--game-orange)]/30 bg-[var(--game-orange)]/10 px-4 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Your balance</p>
            <p className="text-xl font-bold text-[var(--game-orange)]">{pointsBalance.toLocaleString()} pts</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rewards.map((reward) => {
            const locked = !reward.can_afford;
            const pct = Math.min(100, (pointsBalance / reward.points_cost) * 100);
            const team = isTeamReward(reward);
            return (
              <div
                key={reward.id}
                className={`relative overflow-hidden rounded-xl border p-4 transition ${
                  locked
                    ? "border-white/5 bg-black/20 opacity-80"
                    : team
                      ? "border-[var(--game-teal)]/35 bg-gradient-to-br from-[var(--game-teal)]/10 to-transparent hover:border-[var(--game-teal)]/50"
                      : "border-[var(--game-orange)]/30 bg-gradient-to-br from-[var(--game-orange)]/10 to-transparent hover:border-[var(--game-orange)]/50"
                }`}
              >
                {locked && (
                  <div className="absolute right-3 top-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
                <div className="text-3xl">{reward.icon}</div>
                <p className="mt-2 font-semibold">{reward.name}</p>
                <p
                  className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
                    team ? "text-[var(--game-teal)]" : "text-muted-foreground"
                  }`}
                >
                  {team
                    ? `Team${reward.team_name ? ` · ${reward.team_name}` : ""}`
                    : "Company-wide"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                <p className="mt-3 text-sm font-bold text-[var(--game-orange)]">
                  {reward.points_cost.toLocaleString()} pts
                </p>
                {locked && (
                  <div className="mt-2">
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
                      <div className="h-full bg-muted-foreground/50" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {(reward.points_cost - pointsBalance).toLocaleString()} pts to unlock
                    </p>
                  </div>
                )}
                <Button
                  className="mt-4 w-full"
                  size="sm"
                  disabled={locked}
                  onClick={() => {
                    setSelected(reward);
                    setError(null);
                  }}
                >
                  {locked ? "Locked" : "Redeem"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {redemptions.length > 0 && (
        <div className="game-panel p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your redemptions</h3>
          <div className="mt-3 space-y-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{r.reward_icon}</span>
                  <div>
                    <p className="text-sm font-medium">{r.reward_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.points_cost.toLocaleString()} pts · {new Date(r.created_at).toLocaleDateString()}
                      {" · "}
                      {r.scope === "team"
                        ? `Team${r.team_name ? ` · ${r.team_name}` : ""}`
                        : "Company-wide"}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold ${STATUS_COLORS[r.status]}`}>
                  {STATUS_LABELS[r.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem {selected?.name}?</DialogTitle>
            <DialogDescription>
              This will deduct {selected?.points_cost.toLocaleString()} points. Your request goes to{" "}
              {approverLabel(selected)} for approval.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder={
              isTeamReward(selected)
                ? "Optional note for your team manager…"
                : "Optional note for admin…"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSelected(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleRedeem} disabled={submitting}>
              {submitting ? "Submitting…" : "Confirm redeem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
