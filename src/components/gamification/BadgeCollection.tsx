import type { BadgeInfo } from "@/lib/gamification";

function badgeStyle(badge: BadgeInfo): string {
  if (badge.earned_current_period) {
    return "border-[var(--game-orange)]/50 bg-[var(--game-orange)]/10 shadow-[0_0_12px_rgba(255,140,0,0.15)]";
  }
  if (badge.earned_ever) {
    return "border-[var(--game-teal)]/30 bg-[var(--game-teal)]/5 opacity-90";
  }
  return "border-border/50 bg-black/20 opacity-50 grayscale";
}

export function BadgeCollection({
  badges,
  summary,
}: {
  badges: BadgeInfo[];
  summary: {
    earned: number;
    earned_ever: number;
    earned_current_period: number;
    total: number;
  };
}) {
  const repeatable = badges.filter((b) => b.period !== "all_time").length;

  return (
    <div className="game-panel p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Badge Collection</h2>
        <div className="text-right text-xs text-muted-foreground">
          <p>{summary.earned_ever ?? summary.earned} of {summary.total} unlocked (ever)</p>
          <p>{summary.earned_current_period} active {summary.earned_current_period === 1 ? "period" : "periods"} right now</p>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Daily and weekly badges can be earned again each new period. Lifetime badges stay unlocked once earned.
        {repeatable > 0 && ` ${repeatable} badges reset by period.`}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((badge) => (
          <div
            key={badge.slug}
            className={`rounded-lg border p-3 text-center transition-colors ${badgeStyle(badge)}`}
          >
            <div className="text-2xl">{badge.icon}</div>
            <p className="mt-2 text-sm font-semibold">{badge.name}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{badge.description}</p>
            {badge.status_label ? (
              <p
                className={
                  "mt-2 text-[10px] font-medium " +
                  (badge.earned_current_period
                    ? "text-[var(--game-orange)]"
                    : "text-[var(--game-teal)]")
                }
              >
                {badge.status_label}
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-muted-foreground capitalize">
                {badge.period === "all_time" ? "Lifetime" : `Resets each ${badge.period_label}`}
              </p>
            )}
            {badge.times_earned > 1 && (
              <p className="mt-1 text-[10px] text-muted-foreground">×{badge.times_earned} times</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
