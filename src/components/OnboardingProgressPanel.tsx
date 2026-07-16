import { useEffect, useState } from "react";
import { Lock, Target, Trophy, TrendingUp, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchOnboardingDashboard,
  updateIncomeGoal,
  type OnboardingDashboard,
} from "@/lib/payouts";
import { formatCurrency } from "@/lib/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function fmtK(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return formatCurrency(n);
}

export function OnboardingProgressPanel({ agentId }: { agentId?: string }) {
  const { session } = useAuth();
  const [data, setData] = useState<OnboardingDashboard | null>(null);
  const [goalDraft, setGoalDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchOnboardingDashboard(session?.access_token, agentId)
      .then((d) => {
        setData(d);
        setGoalDraft(
          d.income_goal.annual_income_goal ? String(d.income_goal.annual_income_goal) : "",
        );
      })
      .catch((err) => console.error("[Onboarding]", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token, agentId]);

  if (loading) {
    return (
      <div className="game-panel animate-pulse p-6 text-sm text-muted-foreground">
        Loading progress…
      </div>
    );
  }
  if (!data) return null;

  const { tracker, income_goal, milestones } = data;
  const earnedCount = milestones.milestones.filter((m) => m.earned).length;

  return (
    <div className="space-y-4">
      <div className="game-panel overflow-hidden p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--game-teal)]/30 bg-[var(--game-teal)]/10">
                <TrendingUp className="h-4 w-4 text-[var(--game-teal)]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-teal)]">
                  Season path
                </p>
                <h3 className="text-base font-bold">13-Week Tracker</h3>
              </div>
              {tracker.phase_label && (
                <span className="rounded-md border border-[var(--game-orange)]/35 bg-[var(--game-orange)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--game-orange)]">
                  {tracker.phase_label}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {tracker.first_sale_at
                ? `Started ${new Date(tracker.first_sale_at).toLocaleDateString()} · Week ${tracker.current_week}`
                : "Starts automatically on your first submitted deal."}
            </p>
          </div>
          {tracker.active && (
            <div className="rounded-lg border border-[var(--game-orange)]/25 bg-[var(--game-orange)]/10 px-3 py-2 text-right">
              <p className="num text-lg font-bold text-[var(--game-orange)]">
                {formatCurrency(tracker.phase_submitted)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                of {formatCurrency(tracker.phase_goal)}
              </p>
            </div>
          )}
        </div>

        {!tracker.first_sale_at ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-5 text-center">
            <Zap className="mx-auto h-5 w-5 text-[var(--game-orange)]" />
            <p className="mt-2 text-sm text-muted-foreground">
              Log your first sale to start Foundation (weeks 1–{tracker.foundation_weeks}).
            </p>
          </div>
        ) : (
          <>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--game-teal)] to-[var(--game-orange)] transition-all duration-700"
                style={{ width: `${Math.min(100, tracker.phase_pct)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span className="font-medium text-[var(--game-orange)]">{tracker.phase_pct}% complete</span>
              <span>
                Projection:{" "}
                <span
                  className={
                    tracker.projection >= tracker.phase_goal
                      ? "font-semibold text-[var(--success)]"
                      : "text-foreground"
                  }
                >
                  {formatCurrency(tracker.projection)}
                </span>
              </span>
            </div>
            <div
              className="mt-4 grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${tracker.weeks.length || 13}, minmax(0, 1fr))` }}
            >
              {tracker.weeks.map((w) => {
                const filled = w.submitted > 0;
                return (
                  <div
                    key={w.week}
                    className={`rounded-md border px-0.5 py-2 text-center transition ${
                      w.is_current
                        ? "border-[var(--game-orange)]/60 bg-[var(--game-orange)]/15 shadow-[0_0_12px_rgba(255,140,0,0.12)]"
                        : filled
                          ? "border-[var(--game-teal)]/40 bg-[var(--game-teal)]/10"
                          : "border-white/5 bg-black/20"
                    }`}
                    title={`Week ${w.week}: ${formatCurrency(w.submitted)}`}
                  >
                    <div
                      className={`text-[8px] font-semibold uppercase tracking-wider ${
                        w.is_current ? "text-[var(--game-orange)]" : "text-muted-foreground"
                      }`}
                    >
                      W{w.week}
                    </div>
                    <div
                      className={`truncate font-mono text-[9px] ${
                        filled ? "text-foreground" : "text-muted-foreground/50"
                      }`}
                    >
                      {filled ? fmtK(w.submitted) : "–"}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="game-panel p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--game-orange)]/30 bg-[var(--game-orange)]/10">
              <Target className="h-4 w-4 text-[var(--game-orange)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
                Target income
              </p>
              <h3 className="text-sm font-bold">Income goal</h3>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[140px] flex-1">
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                Annual income goal
              </label>
              <Input
                type="number"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="e.g. 100000"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  const updated = await updateIncomeGoal(
                    Number(goalDraft) || 0,
                    session?.access_token,
                    agentId,
                  );
                  setData((d) => (d ? { ...d, income_goal: updated } : d));
                  toast.success("Income goal saved");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed");
                }
              }}
            >
              Save
            </Button>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-[var(--game-teal)] transition-all duration-700"
              style={{ width: `${Math.min(100, income_goal.progress_pct)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-[var(--game-teal)]">
            {income_goal.progress_pct}% toward goal
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: "Expected (blended)", value: income_goal.expected_income_blended },
              { label: "Est. payout YTD", value: income_goal.estimated_payout_ytd },
              { label: "Submitted", value: income_goal.submitted_ytd },
              { label: "Business needed", value: income_goal.business_needed },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-md border border-white/5 bg-black/20 px-2.5 py-2"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{row.label}</p>
                <p className="num mt-0.5 text-sm font-semibold">{formatCurrency(row.value)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="game-panel p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10">
                <Trophy className="h-4 w-4 text-[var(--gold)]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--gold)]">
                  Unlock rewards
                </p>
                <h3 className="text-sm font-bold">Onboarding milestones</h3>
              </div>
            </div>
            <span className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {earnedCount}/{milestones.milestones.length}
            </span>
          </div>
          <ul className="space-y-2">
            {milestones.milestones.map((m) => (
              <li
                key={m.id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                  m.earned
                    ? "border-[var(--success)]/40 bg-[var(--success)]/10"
                    : "border-white/5 bg-black/20"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                      m.earned
                        ? "border-[var(--success)]/40 bg-[var(--success)]/15 text-[var(--success)]"
                        : "border-white/10 bg-black/30 text-muted-foreground"
                    }`}
                  >
                    {m.earned ? <Trophy className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground">{m.description}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  {m.cash_reward > 0 && (
                    <div className="num font-semibold text-[var(--game-orange)]">
                      {formatCurrency(m.cash_reward)}
                    </div>
                  )}
                  <div className={m.earned ? "font-semibold text-[var(--success)]" : "text-muted-foreground"}>
                    {m.earned ? "Earned" : "Locked"}
                  </div>
                </div>
              </li>
            ))}
            {milestones.milestones.length === 0 && (
              <li className="text-sm text-muted-foreground">No milestones configured.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
