import type { WeeklyChallenge } from "@/lib/gamification";

export function WeeklyChallenges({ challenges }: { challenges: WeeklyChallenge[] }) {
  return (
    <div className="game-panel p-5 sm:p-6">
      <h2 className="text-lg font-bold">Weekly challenges</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Finish these before the week ends — bonus points add to your store balance automatically.
      </p>
      <div className="mt-4 space-y-4">
        {challenges.map((c) => {
          const pct = c.target > 0 ? Math.min(100, (c.current / c.target) * 100) : 0;
          const done = c.current >= c.target;
          return (
            <div key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.current} of {c.target} · +{c.points} pts
                  </p>
                </div>
                {done && (
                  <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                    Done
                  </span>
                )}
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full bg-[var(--game-orange)] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
