import type { LevelInfo, AgentProgress } from "@/lib/gamification";
import { tierColor } from "@/lib/gamification";

export function TierLadder({
  levels,
  progress,
}: {
  levels: LevelInfo[];
  progress: AgentProgress;
}) {
  const currentRank = progress.level_rank || 1;

  return (
    <div className="game-panel p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Agent Tier Progress</h2>
          <p className="text-xs text-muted-foreground">
            Higher tiers unlock recognition and contest perks
          </p>
        </div>
        {progress.next_level_name && (
          <p className="text-xs text-[var(--game-orange)]">
            {progress.xp_to_next.toLocaleString()} XP to {progress.next_level_name}
          </p>
        )}
      </div>

      <div className="relative hidden sm:block">
        <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-black/40" />
        <div
          className="absolute left-0 top-5 h-1 rounded-full bg-[var(--game-orange)] transition-all"
          style={{
            width: `${Math.min(100, ((currentRank - 1) / Math.max(1, levels.length - 1)) * 100)}%`,
          }}
        />
        <div className="relative flex justify-between gap-1">
          {levels.slice(0, 9).map((level) => {
            const reached = currentRank >= level.rank;
            const color = reached ? tierColor(level.tier_type as AgentProgress["level_tier"]) : undefined;
            return (
              <div key={level.slug} className="flex max-w-[4.5rem] flex-col items-center text-center">
                <div
                  className={
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold " +
                    (reached
                      ? "border-[var(--game-orange)] bg-[var(--game-orange)]/15"
                      : "border-border bg-secondary text-muted-foreground")
                  }
                  style={reached ? { color } : undefined}
                >
                  {level.rank}
                </div>
                <p
                  className="mt-2 text-[10px] font-semibold leading-tight"
                  style={reached ? { color } : undefined}
                >
                  {level.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 sm:hidden">
        <p className="text-sm font-semibold text-[var(--game-orange)]">{progress.level_name}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full bg-[var(--game-orange)]"
            style={{ width: `${progress.level_progress_pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
