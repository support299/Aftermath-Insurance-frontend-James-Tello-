import { formatCurrency } from "@/lib/sales";
import { agentInitials } from "@/lib/gamification";
import { Swords } from "lucide-react";

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
  const leftLeads = left.revenue >= right.revenue;

  return (
    <div className="game-panel relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.74_0.14_175_/_0.08),_transparent_55%)]" />
      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--game-orange)]">
            Team standings
          </p>
          <h2 className="mt-0.5 text-lg font-bold">Head-to-head</h2>
          {weeklyGoal != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Stretch goal: {formatCurrency(goal)} combined
            </p>
          )}
        </div>
        <p className="rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Winner bonus pool
        </p>
      </div>

      <div className="relative grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div
          className={
            "rounded-xl border p-4 transition " +
            (leftLeads
              ? "border-[var(--game-orange)]/40 bg-[var(--game-orange)]/10"
              : "border-white/5 bg-black/20")
          }
        >
          {leftLeads && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--game-orange)]">
              Leading
            </p>
          )}
          <h3 className="text-lg font-bold">{left.team_name}</h3>
          <p className="num mt-1 text-2xl font-bold text-[var(--game-orange)]">
            {formatCurrency(left.revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{left.agent_count} agents active</p>
        </div>

        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[var(--game-teal)] shadow-lg">
            <Swords className="h-5 w-5" />
          </div>
        </div>

        <div
          className={
            "rounded-xl border p-4 transition sm:text-right " +
            (!leftLeads
              ? "border-[var(--game-teal)]/40 bg-[var(--game-teal)]/10"
              : "border-white/5 bg-black/20")
          }
        >
          {!leftLeads && (
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--game-teal)]">
              Leading
            </p>
          )}
          <h3 className="text-lg font-bold">{right.team_name}</h3>
          <p className="num mt-1 text-2xl font-bold text-[var(--game-teal)]">
            {formatCurrency(right.revenue)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{right.agent_count} agents active</p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="mb-1.5 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>{leftPct.toFixed(0)}%</span>
          <span>{(100 - leftPct).toFixed(0)}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/5">
          <div className="flex h-full">
            <div
              className="h-full bg-gradient-to-r from-[var(--game-orange)] to-[var(--game-orange)]/80 transition-all duration-700"
              style={{ width: `${leftPct}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-[var(--game-teal)]/80 to-[var(--game-teal)] transition-all duration-700"
              style={{ width: `${100 - leftPct}%` }}
            />
          </div>
        </div>
      </div>

      <p className="relative mt-3 text-[11px] text-muted-foreground">
        Top two teams by revenue this period · Resets with the selected timeframe
      </p>
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
