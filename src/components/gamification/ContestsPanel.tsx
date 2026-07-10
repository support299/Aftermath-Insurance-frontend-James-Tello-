import { formatCurrency } from "@/lib/sales";
import type { ContestInfo } from "@/lib/gamification";

export function ContestsPanel({ contests }: { contests: ContestInfo[] }) {
  if (contests.length === 0) {
    return (
      <div className="game-panel p-5 sm:p-6">
        <h2 className="text-lg font-bold">Active Contests</h2>
        <p className="mt-2 text-sm text-muted-foreground">No active contests right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {contests.map((contest) => (
        <div key={contest.id} className="game-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
                {contest.scope === "team" ? `Team contest${contest.team_name ? ` · ${contest.team_name}` : ""}` : "Company-wide contest"}
              </p>
              <h2 className="mt-1 text-xl font-bold">{contest.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{contest.description}</p>
            </div>
            <div className="rounded-lg bg-[var(--game-orange)]/10 px-3 py-2 text-right">
              <p className="text-xs text-muted-foreground">Prize</p>
              <p className="text-sm font-semibold text-[var(--game-orange)]">{contest.prize_description}</p>
            </div>
          </div>

          {contest.progress_pct != null && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>
                  Your progress: {contest.metric.includes("count")
                    ? contest.current
                    : formatCurrency(contest.current)}
                </span>
                {contest.target != null && (
                  <span>
                    Goal: {contest.metric.includes("count")
                      ? contest.target
                      : formatCurrency(contest.target)}
                  </span>
                )}
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full bg-[var(--game-teal)] transition-all"
                  style={{ width: `${contest.progress_pct}%` }}
                />
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] text-muted-foreground">
            Ends {new Date(contest.end_date).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  );
}
