import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchIncentives, type IncentivesData, type RedemptionInfo } from "@/lib/gamification";
import { LIVE_REFRESH_MS } from "@/lib/sales-events";
import { useOnSalesChanged } from "@/hooks/use-on-sales-changed";
import { Button } from "@/components/ui/button";
import { LevelBadge } from "@/components/gamification/LevelBadge";
import { TierLadder } from "@/components/gamification/TierLadder";
import { HowYouEarnPanel } from "@/components/gamification/HowYouEarnPanel";
import { BadgeCollection } from "@/components/gamification/BadgeCollection";
import { WeeklyChallenges } from "@/components/gamification/WeeklyChallenges";
import { ContestsPanel } from "@/components/gamification/ContestsPanel";
import { RewardsStore } from "@/components/gamification/RewardsStore";

export const Route = createFileRoute("/_app/incentives")({
  component: IncentivesPage,
});

function IncentivesPage() {
  const { session, profile } = useAuth();
  const [data, setData] = useState<IncentivesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(new Date());
  const loadSeq = useRef(0);

  const load = useCallback((opts?: { silent?: boolean }) => {
    const seq = ++loadSeq.current;
    if (!opts?.silent) setLoading(true);
    return fetchIncentives(session?.access_token)
      .then((payload) => {
        if (seq !== loadSeq.current) return;
        setData(payload);
        setRefreshedAt(new Date());
      })
      .catch((err) => {
        if (seq === loadSeq.current) console.error("[Incentives]", err);
      })
      .finally(() => {
        if (seq === loadSeq.current && !opts?.silent) setLoading(false);
      });
  }, [session?.access_token]);

  const handleRedeemed = useCallback(
    (redemption: RedemptionInfo) => {
      setData((prev) => {
        if (!prev) return prev;
        if (prev.redemptions.some((r) => r.id === redemption.id)) return prev;

        const newBalance = Math.max(0, prev.points_balance - redemption.points_cost);
        return {
          ...prev,
          points_balance: newBalance,
          progress: { ...prev.progress, points_balance: newBalance },
          redemptions: [redemption, ...prev.redemptions],
          rewards: prev.rewards.map((reward) => ({
            ...reward,
            can_afford: newBalance >= reward.points_cost,
          })),
        };
      });
      void load({ silent: true });
    },
    [load],
  );

  useEffect(() => {
    load();
    const t = setInterval(load, LIVE_REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useOnSalesChanged(load);

  if (loading && !data) {
    return (
      <div className="game-panel p-12 text-center text-sm text-muted-foreground">
        Loading your incentives…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="game-panel p-12 text-center text-sm text-muted-foreground">
        Could not load incentives. Try refreshing.
      </div>
    );
  }

  const { progress } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Incentives</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome{profile ? `, ${profile.display_name}` : ""} — earn XP to level up, points for rewards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Updated {refreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Store points"
          value={data.points_balance.toLocaleString()}
          sub="Spend in rewards store · earn per sale"
        />
        <StatCard
          label="Rank"
          value={progress.level_name}
          sub={progress.next_level_name ? `${progress.xp_to_next.toLocaleString()} XP to ${progress.next_level_name}` : "Max tier reached"}
        />
        <StatCard
          label="Sales streak"
          value={`${progress.current_streak} days`}
          sub={`Personal best: ${progress.best_streak} days`}
          icon={<Flame className="h-4 w-4 text-[var(--game-orange)]" />}
        />
        <StatCard
          label="Badges"
          value={`${data.badges_summary.earned_current_period} active`}
          sub={`${data.badges_summary.earned_ever} / ${data.badges_summary.total} unlocked ever`}
        />
      </div>

      {data.earning_rules && <HowYouEarnPanel rules={data.earning_rules} />}

      <div className="game-panel flex flex-wrap items-center gap-4 p-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Your rank</p>
          <div className="mt-1 flex items-center gap-2">
            <LevelBadge progress={progress} size="md" />
            <span className="text-sm text-muted-foreground">{progress.total_xp.toLocaleString()} XP</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-[var(--game-orange)]">
          <Zap className="h-4 w-4" />
          {progress.level_progress_pct}% to next level
        </div>
      </div>

      <TierLadder levels={data.levels} progress={progress} />

      <div className="grid gap-4 lg:grid-cols-2">
        <WeeklyChallenges challenges={data.weekly_challenges} />
        <BadgeCollection badges={data.badges} summary={data.badges_summary} />
      </div>

      <ContestsPanel contests={data.contests} />

      <RewardsStore
        rewards={data.rewards ?? []}
        redemptions={data.redemptions ?? []}
        pointsBalance={data.points_balance}
        accessToken={session?.access_token}
        onRedeemed={handleRedeemed}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="game-panel p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {icon}
        <p className="text-xl font-bold">{value}</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
