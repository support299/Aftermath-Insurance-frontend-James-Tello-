import { formatCurrency } from "@/lib/sales";
import { agentInitials } from "@/lib/gamification";

export interface TeamBattleSide {
  team_id: string;
  team_name: string;
  revenue: number;
  agent_count: number;
}

export function TeamBattleBar({
  left,
  right,
  weeklyGoal,
}: {
  left: TeamBattleSide;
  right: TeamBattleSide;
  weeklyGoal?: number;
}) {
  const combined = left.revenue + right.revenue;
  const leftPct = combined > 0 ? (left.revenue / combined) * 100 : 50;
  const goal = weeklyGoal ?? combined * 1.5;

  return (
    <div className="game-panel overflow-hidden p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
            Team Standings — This Week
          </p>
          {weeklyGoal != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Weekly goal: {formatCurrency(goal)} combined
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Winning team gets bonus points pool</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <h3 className="text-lg font-bold">{left.team_name}</h3>
          <p className="num mt-1 text-2xl font-bold text-[var(--game-orange)]">
            {formatCurrency(left.revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{left.agent_count} agents active</p>
        </div>
        <div className="hidden px-2 pb-2 text-sm font-medium text-muted-foreground sm:block">vs</div>
        <div className="sm:text-right">
          <h3 className="text-lg font-bold">{right.team_name}</h3>
          <p className="num mt-1 text-2xl font-bold text-[var(--game-teal)]">
            {formatCurrency(right.revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{right.agent_count} agents active</p>
        </div>
      </div>

      <div className="mt-5 h-4 overflow-hidden rounded-full bg-black/40">
        <div className="flex h-full">
          <div
            className="h-full bg-[var(--game-orange)] transition-all duration-700"
            style={{ width: `${leftPct}%` }}
          />
          <div
            className="h-full bg-[var(--game-teal)] transition-all duration-700"
            style={{ width: `${100 - leftPct}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground">Resets every Monday 12:00 AM</p>
    </div>
  );
}

export function AgentAvatar({ name, highlight }: { name: string; highlight?: boolean }) {
  return (
    <div
      className={
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
        (highlight
          ? "bg-[var(--game-orange)]/20 text-[var(--game-orange)] ring-2 ring-[var(--game-orange)]/50"
          : "bg-secondary text-foreground")
      }
    >
      {agentInitials(name)}
    </div>
  );
}
