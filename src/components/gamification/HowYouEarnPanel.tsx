import { Coins, Sparkles, Trophy } from "lucide-react";
import type { EarningRules } from "@/lib/gamification-admin";
import {
  estimateSalePoints,
  estimateSaleXp,
  EXAMPLE_SALE,
  formatPointsRuleLine,
  formatXpRuleLine,
} from "@/lib/earning-rules";

export function HowYouEarnPanel({ rules }: { rules: EarningRules }) {
  const exampleXp = estimateSaleXp(rules);
  const examplePts = estimateSalePoints(rules);

  return (
    <div className="game-panel p-5 sm:p-6">
      <h2 className="text-lg font-bold">How you earn</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Two currencies: <strong className="text-foreground">XP</strong> levels you up;{" "}
        <strong className="text-foreground">points</strong> spend in the rewards store below.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--game-orange)]/20 bg-[var(--game-orange)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--game-orange)]">
            <Sparkles className="h-4 w-4" />
            <h3 className="font-semibold">XP — level & rank</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Added when you log a sale (all your sales count toward your total).</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {formatXpRuleLine(rules).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[var(--game-orange)]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-md bg-black/20 px-2 py-1.5 text-xs text-muted-foreground">
            Example: ${EXAMPLE_SALE.total} deal (${EXAMPLE_SALE.life} life + ${EXAMPLE_SALE.health} health) →{" "}
            <strong className="text-foreground">~{exampleXp.toLocaleString()} XP</strong>
          </p>
        </div>

        <div className="rounded-lg border border-[var(--game-teal)]/20 bg-[var(--game-teal)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--game-teal)]">
            <Coins className="h-4 w-4" />
            <h3 className="font-semibold">Points — rewards store</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Added per sale, plus bonuses from badges and weekly challenges.</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {formatPointsRuleLine(rules).map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-[var(--game-teal)]">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 rounded-md bg-black/20 px-2 py-1.5 text-xs text-muted-foreground">
            Example: ${EXAMPLE_SALE.pointsPremium} premium sale →{" "}
            <strong className="text-foreground">{examplePts} points</strong>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-2 rounded-md border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-[var(--game-orange)]" />
        <p>
          <strong className="text-foreground">Also earn points from:</strong> achievement badges (some repeat weekly/daily),
          weekly challenges on this page, and manager contests. Badge amounts vary — defaults start around{" "}
          {rules.default_badge_points} pts if not set per badge.
        </p>
      </div>
    </div>
  );
}
